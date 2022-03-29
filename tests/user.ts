import {  PublicKey } from '@solana/web3.js';
import { beefMintAddress, stakeMintAddress, userWallet } from "../scripts/config"
import { TokenHelper } from "./token_helper";
import { Wallet } from "@project-serum/anchor";


class User {
    beefToken: TokenHelper;
    beefTokenBag: PublicKey;
    stakeToken: TokenHelper;
    stakeTokenBag: PublicKey;
    wallet: Wallet;

    constructor(wallet = userWallet) {
        this.beefToken = new TokenHelper(beefMintAddress);
        this.stakeToken = new TokenHelper(stakeMintAddress);
        this.wallet = wallet;
    }

    getOrCreateBeefTokenBag = async () => {
       this.beefTokenBag = (await this.beefToken.getOrCreateTokenBag(this.wallet.publicKey)).address;
    }

    getOrCreateStakeTokenBag = async () => {
        this.stakeTokenBag = (await this.stakeToken.getOrCreateTokenBag(this.wallet.publicKey)).address;
    }

    beefBalance = async () => {
        // call getOrCreateBeefTokenBag first
        return await this.beefToken.balance(this.beefTokenBag);
    }

    stakeBalance = async () => {
        // call getOrCreateStakeTokenbag first
        return await this.beefToken.balance(this.stakeTokenBag);
    }
}


export {
    User
}