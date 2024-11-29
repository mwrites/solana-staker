import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staker } from "../target/types/staker";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.Staker as Program<Staker>;
const connection = anchor.getProvider().connection;
const userWallet = anchor.workspace.Staker.provider.wallet;

const randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
  const wallet = Keypair.generate();
  const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
  await connection.confirmTransaction(signature);
  return wallet;
};

const findBeefMintAuthorityPDA = async (): Promise<[PublicKey, number]> => {
  return await getProgramDerivedAddress(beefMintAddress);
};

const findStakeMintAuthorityPDA = async (): Promise<[PublicKey, number]> => {
  return await getProgramDerivedAddress(stakeMintAddress);
};

const getProgramDerivedAddress = async (
  seed: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [seed.toBuffer()],
    program.programId
  );
};

async function ignoreAlreadyInUse<T>(
  operation: () => Promise<T>
): Promise<T | void> {
  try {
    return await operation();
  } catch (error: any) {
    if (!error.logs?.some((log: string) => log.includes("already in use"))) {
      throw error; // Re-throw if it's a different error
    }
    console.log("Account already exists, continuing...");
  }
}

// @ts-ignore
const beefData = JSON.parse(fs.readFileSync("keys_for_test/beef_mint.json"));
const beefMintKeypair = Keypair.fromSecretKey(new Uint8Array(beefData));
const beefMintAddress = beefMintKeypair.publicKey;

// @ts-ignore
const stakeData = JSON.parse(fs.readFileSync("keys_for_test/stake_mint.json"));
const stakeMintKeypair = Keypair.fromSecretKey(new Uint8Array(stakeData));
const stakeMintAddress = stakeMintKeypair.publicKey;

export {
  program,
  connection,
  userWallet,
  randomPayer,
  beefMintKeypair,
  beefMintAddress,
  stakeMintKeypair,
  stakeMintAddress,
  findBeefMintAuthorityPDA,
  findStakeMintAuthorityPDA,
  ignoreAlreadyInUse,
};
