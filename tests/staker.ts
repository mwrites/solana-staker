import { expect } from 'chai';
import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  stakeMintAddress,
  beefMintAddress,
  program,
  findStakeMintAuthorityPDA
} from "../scripts/config"
import { User } from "./user";
import { createMints } from "../scripts/create-mints";
import { airdropBeef } from "../scripts/airdrop-beef";
import { TokenHelper } from "./token_helper";



describe("staker", () => {

  before(async () => {
    await createMints();
    await airdropBeef();
  });


  it('It creates the program 🐮💰 beef token bag', async () => {
    const user = new User();
    const [beefPDA, _] = await getProgramBeefTokenBagPDA();

    await program.rpc.createBeefTokenBag({
      accounts: {
        beefMint: beefMintAddress,
        programBeefTokenBag: beefPDA,
        payer: user.wallet.publicKey,

        // Solana is lost: where are my spl program friends?
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      }
    });

    const tokenHelper = new TokenHelper(beefMintAddress);
    expect(await tokenHelper.balance(beefPDA)).to.be.eql(0);
  });


  it('Swap $🐮 for $🥩', async () => {
    // 0. Prepare Token Bags
    const user =  new User();
    await user.getOrCreateStakeTokenBag();

    // 1. Get current stake amount
    const userStakes = await user.stakeBalance();

    // PDA with stakeMint as seed is the stakeMintAuthority
    const [stakePDA, stakePDABump] = await findStakeMintAuthorityPDA();

    // 2. Execute our stuff
    await program.rpc.stake(
        stakePDABump,
        new anchor.BN(5_000),
        {
          accounts: {
            // Solana is lost: where are my spl program friends?
            tokenProgram: TOKEN_PROGRAM_ID,


            // **************
            // MINT
            // **************

            // Token Program asks: 🏭 what type of token am I supposed to print?
            stakeMint: stakeMintAddress,

            // Token Program asks: ✍️ who is allowed to print tokens from stakeMint?
            stakeMintAuthority: stakePDA,

            // 💰🥩 Token Program wonders: "where should I mint this to?"
            userStakeTokenBag: user.stakeTokenBag,



            // **************
            // TRANSFER
            // **************


          },
        },
    );

    // We expect the user to have received 5_000 stakes $🥩
    expect(await user.stakeBalance()).to.be.eql(userStakes + 5_000);
  });
});


const getProgramBeefTokenBagPDA = async (): Promise<[PublicKey, number]> => {
  const seed = beefMintAddress;

  return await PublicKey.findProgramAddress(
      [seed.toBuffer()],
      program.programId
  );
}