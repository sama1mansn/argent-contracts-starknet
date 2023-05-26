import { Account, CallData, Contract, GetTransactionReceiptResponse, hash } from "starknet";
import { deployer } from "./accounts";
import { loadContract } from "./contracts";
import { fundAccount } from "./devnet";
import { provider } from "./provider";
import { KeyPair, MultisigSigner, randomKeyPair, randomKeyPairs } from "./signers";

export interface MultisigWallet {
  account: Account;
  accountContract: Contract;
  keys: KeyPair[];
  signers: bigint[]; // public keys
  receipt: GetTransactionReceiptResponse;
}

export async function deployMultisig(
  classHash: string,
  threshold: number,
  signersLength: number,
  deploymentIndexes: number[] = [0],
): Promise<MultisigWallet> {
  const keys = sortedKeyPairs(signersLength);
  const signers = keysToSigners(keys);
  const constructorCalldata = CallData.compile({ threshold, signers });
  const addressSalt = randomKeyPair().privateKey;

  const contractAddress = hash.calculateContractAddressFromHash(addressSalt, classHash, constructorCalldata, 0);
  await fundAccount(contractAddress);

  const deploymentSigner = new MultisigSigner(keys.filter((_, i) => deploymentIndexes.includes(i)));
  const account = new Account(provider, contractAddress, deploymentSigner, "1");

  const { transaction_hash } = await account.deploySelf({ classHash, constructorCalldata, addressSalt });
  const receipt = await deployer.waitForTransaction(transaction_hash);

  const accountContract = await loadContract(account.address);
  account.signer = new MultisigSigner(keys.slice(0, threshold));
  accountContract.connect(account);
  return { account, accountContract, keys, signers, receipt };
}

const sortedKeyPairs = (length: number) =>
  randomKeyPairs(length).sort((a, b) => (BigInt(a.publicKey) < BigInt(b.publicKey) ? -1 : 1));

export const keysToSigners = (keys: KeyPair[]) => keys.map(({ publicKey }) => publicKey).map(BigInt);
