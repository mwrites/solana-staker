import { Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import {
    beefMintKeypair,
    stakeMintKeypair,
    connection,
    randomPayer,
    findStakeMintAuthorityPDA,
} from "./config";


const createMints = async () => {
    const beefMintAddress = await createMintAcct(
        beefMintKeypair,
        beefMintKeypair.publicKey
    )

    const [stakePDA, _] =  await findStakeMintAuthorityPDA();
    // const [stakePDA, stakePDABump] = await PublicKey.findProgramAddress(
    //     [stakeMintAddress.toBuffer()],
    //     program.programId
    // );

    const stakeMintAddress = await createMintAcct(
        stakeMintKeypair,
        stakePDA)

    console.log(`🐮 beef Mint Address: ${beefMintAddress}`);
    console.log(`🥩️ stake Mint Address: ${stakeMintAddress}`);
}



const createMintAcct = async (keypairToAssign: Keypair, authorityToAssign: PublicKey): Promise<PublicKey> => {
    return await createMint(
        connection,
        await randomPayer(),
        authorityToAssign, // mint authority
        null, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
        8, // decimals
        keypairToAssign // address of the mint
    );
}


export {
    createMints
}