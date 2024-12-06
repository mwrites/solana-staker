import { mintTo } from "@solana/spl-token";
import { beefMintKeypair, connection, randomPayer } from "./config";
import { TokenHelper } from "../tests/token_helper";
import { User } from "../tests/user";

const airdropBeef = async () => {
  const user = new User();
  await user.getOrCreateBeefTokenBag();

  await mintTo(
    connection,
    await randomPayer(),
    beefMintKeypair.publicKey,
    user.beefTokenBag,
    beefMintKeypair, // a pubkey is not enough, otherwise anyone would be printing tokens!
    1_000_000_000,
    []
  );

  const balance = await new TokenHelper(beefMintKeypair.publicKey).balance(
    user.beefTokenBag
  );
  console.log(
    `🐮 Token Account 💰'${user.beefTokenBag.toString()}' balance: ${balance}`
  );
};

export { airdropBeef };
