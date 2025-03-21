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
contract AccountFactory {
    SimpleAccount public immutable accountImplementation;
    mapping(address => bool) public isAccountCreated;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint);
    }

    /**
     * create an account, and return its address.
     * returns the address even if the account is already deployed.
     * Note that during UserOperation execution, this method is called only if the account is not deployed.
     * This method returns an existing account address so that entryPoint.getSenderAddress() would work even after account creation
     */

    function createAccount(
        address owner,
        uint256 salt
    ) public returns (SimpleAccount ret) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }
        ret = SimpleAccount(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    abi.encodeCall(SimpleAccount.initialize, (owner))
                )
            )
        );
        isAccountCreated[address(ret)] = true;
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function createMultiOwnerAccount(
        address[] memory owners,
        uint256 salt
    ) public returns (AccountFactory[] memory) {
        // Initialize an array to store the created accounts
        AccountFactory[] memory arr = new AccountFactory[](owners.length);

        for (uint i = 0; i < owners.length; i++) {
            // Derive a unique salt for each owner
            uint256 uniqueSalt = uint256(
                keccak256(abi.encodePacked(salt, owners[i]))
            );

            // Calculate the deterministic address
            address addr = getAddress(owners[i], uniqueSalt);

            // Check if an account already exists at this address
            uint codeSize = addr.code.length;
            if (codeSize > 0) {
                // If account exists, add it to the array
                arr[i] = AccountFactory(payable(addr));
            } else {
                // Deploy a new account
                AccountFactory ret = AccountFactory(
                    payable(
                        new ERC1967Proxy{salt: bytes32(uniqueSalt)}(
                            address(accountImplementation),
                            abi.encodeCall(
                                SimpleAccount.initialize,
                                (owners[i])
                            )
                        )
                    )
                );

                // Add the newly created account to the array
                arr[i] = ret;

                // Mark the account as created
                isAccountCreated[address(ret)] = true;
            }
        }

        // Return the array of created accounts
        return arr;
    }

    function getAddress(
        address owner,
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
                            abi.encodeCall(SimpleAccount.initialize, (owner))
                        )
                    )
                )
            );
    }
}
