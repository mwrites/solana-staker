import { Signer, PublicKey, Keypair } from '@solana/web3.js';
import {
    Account,
    createMint,
    getMint,
    getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {connection, randomPayer} from "../scripts/config"


class TokenHelper {
    mint: PublicKey;

    constructor(mint: PublicKey) {
        this.mint = mint;
    }

    getMint = async (): Promise<PublicKey> => {
       return (await getMint(connection, this.mint)).address;
    }

    balance = async (tokenBag: PublicKey) => {
        return parseInt((await connection.getTokenAccountBalance(tokenBag)).value.amount);
    }

    getOrCreateTokenBag = async (owner: PublicKey, isPDA: boolean = false): Promise<Account> => {
        // Get or create the account for token of type mint for owner
        return await getOrCreateAssociatedTokenAccount(
            connection,
            await randomPayer(),
            this.mint,
            owner,
            isPDA,
        );
    }
}



// const run = async () => {
//     try {
//         await airdropBeef();
//         process.exit(0);
//     } catch (error) {
//         console.error(error);
//         process.exit(1);
//     }
// };
// run();


export {
    TokenHelper
}