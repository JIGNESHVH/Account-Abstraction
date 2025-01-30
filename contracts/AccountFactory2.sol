// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/samples/SimpleAccount.sol";

/**
 * A sample factory contract for SimpleAccount
 * A UserOperations "initCode" holds the address of the factory, and a method call (to createAccount, in this sample factory).
 * The factory's createAccount returns the target account address even if it is already installed.
 * This way, the entryPoint.getSenderAddress() can be called either before or after the account is created.
 */

contract AccountFactory2 {
    SimpleAccount public immutable accountImplementation;
    mapping(address => bool) public isAccountCreated;

    constructor(IEntryPoint _entryPoint, uint256 _requiredApprovals) {
        accountImplementation = new SimpleAccount(_entryPoint);
        requiredApprovals = _requiredApprovals;
    }

    mapping(address => bool) public isOwner;
    uint256 public requiredApprovals;
    // address[] public owners;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 approvals;
        bool executed;
        bytes32 txHash;
        address smartAccountAddress;
    }

    mapping(bytes32 => Transaction) public transactions;
    mapping(address => address) public smartAccountHash;
    mapping(bytes32 => mapping(address => bool)) public transactionApprovals;

    event TransactionProposed(bytes32 indexed txHash, address proposer);
    event TransactionApproved(bytes32 indexed txHash, address approver);
    event TransactionExecuted(bytes32 indexed txHash, address executor);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier notExecuted(bytes32 txHash) {
        require(!transactions[txHash].executed, "Transaction already executed");
        _;
    }

    modifier isValidTransaction(bytes32 txHash) {
        require(
            transactions[txHash].to != address(0),
            "Transaction does not exist"
        );
        _;
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function createMultiOwnerAccount(
        address[] memory owners,
        uint256 salt
    ) public returns (address[] memory) {
        address[] memory createdAccounts = new address[](owners.length);

        // Assigning owners and creating accounts
        for (uint256 i = 0; i < owners.length; i++) {
            address owner = owners[i];
            isOwner[owner] = true; // Assign the owner

            uint256 uniqueSalt = uint256(
                keccak256(abi.encodePacked(salt, owner))
            );
            address addr = getAddress(owners, uniqueSalt);

            uint256 codeSize = addr.code.length;
            if (codeSize > 0) {
                // If account exists, add it to the array
                createdAccounts[i] = addr;
            } else {
                // Deploy a new account
                SimpleAccount newAccount = SimpleAccount(
                    payable(
                        new ERC1967Proxy{salt: bytes32(uniqueSalt)}(
                            address(accountImplementation),
                            abi.encodeCall(SimpleAccount.initialize, (owner))
                        )
                    )
                );
                createdAccounts[i] = address(newAccount);
                isAccountCreated[address(newAccount)] = true;
                smartAccountHash[msg.sender] = addr;
            }
        }

        // Return the array of created accounts
        return createdAccounts;
    }

    // function getAddress(address owner, uint256 salt)
    //     public
    //     view
    //     returns (address)
    // {
    //     return
    //         Create2.computeAddress(
    //             bytes32(salt),
    //             keccak256(
    //                 abi.encodePacked(
    //                     type(ERC1967Proxy).creationCode,
    //                     abi.encode(
    //                         address(accountImplementation),
    //                         abi.encodeCall(SimpleAccount.initialize, (owner))
    //                     )
    //                 )
    //             )
    //         );
    // }

    function getAddress(
        address[] memory owners,
        uint256 salt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeWithSelector(
                                SimpleAccount.initialize.selector,
                                owners
                            ) // ✅ FIXED: Encode the array properly
                        )
                    )
                )
            );
    }

    function proposeTransaction(
        address to,
        uint256 value,
        bytes memory data
    ) public {
        bytes32 txHash = keccak256(
            abi.encodePacked(to, value, data, block.timestamp)
        );
        require(
            transactions[txHash].to == address(0),
            "Transaction already proposed"
        );

        transactions[txHash] = Transaction({
            to: to,
            value: value,
            data: data,
            approvals: 0,
            executed: false,
            txHash: txHash,
            smartAccountAddress: address(0)
        });

        emit TransactionProposed(txHash, msg.sender);
    }

    /**
     * Approve a proposed transaction.
     * @param txHash The transaction hash of the proposed transaction
     */
    function approveTransaction(bytes32 txHash) public {
        require(isOwner[msg.sender], "Only owners can approve transactions");
        require(
            transactions[txHash].to != address(0),
            "Transaction does not exist"
        );
        require(!transactions[txHash].executed, "Transaction already executed");

        transactions[txHash].approvals += 1;

        emit TransactionApproved(txHash, msg.sender);

        // Execute the transaction if required approvals are reached
        if (transactions[txHash].approvals >= requiredApprovals) {
            executeTransaction(txHash);
        }
    }

    /**
     * Execute a proposed transaction if enough approvals are received.
     * @param txHash The transaction hash of the proposed transaction
     */
    function executeTransaction(bytes32 txHash) internal {
        Transaction storage txn = transactions[txHash];

        require(txn.approvals >= requiredApprovals, "Not enough approvals");
        require(!txn.executed, "Transaction already executed");

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Transaction failed");

        txn.executed = true;
        emit TransactionExecuted(txHash, msg.sender);
    }

    receive() external payable {}

    function transferEther(address _to, uint256 amount) public onlyOwner {
        require(amount > 0, "please add valid Value");
        require(_to != address(0), "");
        payable(_to).transfer(amount);
    }
}
