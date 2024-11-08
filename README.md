## Let's Pair-Progra-Cook A Solana Staking Program - Part 1

# 🥩 Cooking a Staking App

👨🏻‍🍳  Let's cook a DeFi staking program together! We will use a top-down approach to build this. This is not a simple copy and paste article. Instead, this is more a pair programming style challenge where we will peel the onion by layer and ask ourselves the questions required to complete this project. We will uncover the ingredients necessary to construct a staker program in Solana in the process.

If you are an Etherean, ex etherean, or cyborg etherean-solanian 😁, please jump to the EVM Comparison.




---


# 🍭 TL;DR - [Github](https://github.com/mwrites/solana-staker)
The code in this article is not exhaustive. Instead, it will illustrate the important pieces so that you develop the mental model to build a DeFi program yourself in the future.

Please don't try to copy-paste any of the code here. It probably won't compile. I have reduced the noise on purpose. However, the complete code is available [here](https://github.com/mwrites/solana-staker). Feel free to look at it along with the article or clone it locally and try it.


---


# 🔥 Warmup

### 🎓 Prerequisites

This is not an intro to Solana and blockchains. If you are not familiar with the Account Model, I highly recommend that you familiarize yourself with my [introduction](https://blog.mwrites.xyz/your-first-solana-program) first. Also, knowing what PDAs are could be helpful, but you can also dig into it afterward [here](https://blog.mwrites.xyz/solana-what-is-a-program-derived-address).


### 🗺 Context

What is Staking? Staking is lending your tokens into a vault in exchange for a reward token. For example, some vaults might lock your tokens for some duration, while some do not. Some vaults even give you additional rewards based on the number of tokens staked.

[Raydium](https://raydium.io/staking):
![staking-example-raydium.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648665118719/NkhvSAJp-.png)


### 🎯 Our Goal

![staking-flow.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648665189088/1s26PLrUs.png)


Our mission, if you accept it, is to build a Solana program that:

* Let users stake (lend) $🐮 to our program in exchange for $🥩.
* Let users unstake (or redeem) their $🥩 for the original $🐮 and make a profit (or loss!) on it.


You might know that there are several ways to stake. In some dapps, your stakes are locked. In others, you don't even get a reward token. This article will focus on staking a $token in exchange for a $sToken where the value of $sToken increases over time by just holding it.


---

# 👨🏻‍🍳 Tonight The Chef Propose

**Humans have two faces, and Solanians have three.**

As usual with Solana, we need to prepare accounts ahead of time before feeding them to our programs. We will need to wear different hats, roles, and faces to understand how to build a staker app on Solana.

We will need to work with Solana before touching any rust to create accounts. We will also need to look at the client-side to see how the flow should work. Finally, we will implement the Solana program on the rust side.

**In this episode of Hell's Kitchen**

In this article, we will make an attempt to the staking feature of our program, staking consist of:
1. Minting 🥩tokens to users.
2. Transfering 🐮 from users to the program.

We will make an attempt to the minting part which will lead us to discover several ingredients:
1. Creating a [SPL-Token](https://solanacookbook.com/references/token.html).
2. Signing with a [PDA](https://solanacookbook.com/core-concepts/pdas.html).
3. [Associated Token Accounts](https://spl.solana.com/associated-token-account).
4. [Cross-Program Invocations](https://docs.solana.com/developing/programming-model/calling-between-programs).

The preparation of these ingredients will be 80% of the work, as these are the core skills needed to make other recipes. So most of our effort  will be to understand and prepare these ingredients to complete the minting part. The transfer will be cover in [part 2](https://blog.mwrites.xyz/solana-staking-program-part2).

---


# 🏗 An Attempt To Stake 🥩

> Contributor to this joke: Austin Griffith


### ⚙️ Setup
I assume this is not your first Solana experience, and you already had all the tools installed. If not, please install all the toolchains, and I highly recommend familiarizing yourself with the account model first.

**The code in this article is not exhaustive. Instead, it will illustrate the crucial pieces so that you develop the mental model to build a DeFi program yourself in the future. I will be using simplified rust and js code.**

The repo, however, contains the complete code that you can build and test. Please clone the project:
```shell
git clone git@github.com:mwrites/solana-staker.git
```

FYI, I have added the dependencies for the SPL Token Program in `Cargo.toml`:
```
anchor-spl = "0.22.1"
```

And in `package.json`:
```json
{
	"dependencies": {  
		"@project-serum/anchor": "^0.22.1",  
		"@solana/spl-token": "^0.2.0"  
	},  
	"devDependencies": {  
		"@types/chai": "^4.3.0",  
		 "@types/mocha": "^9.0.0",  
		 "chai": "^4.3.4",  
		 "chai-as-promised": "^7.1.1",  
		 "mocha": "^9.0.3",  
		 "ts-mocha": "^8.0.0",  
		 "ts-node": "^10.7.0",  
		 "typescript": "^4.6.2"  
	},
}
```

Install dependencies:
```shell
yarn install
```

###  🏗 An Attempt to Mint

The main feature we want to build is staking. We need to exchange the user's $🐮 for $🥩. A $🐮 is what the users lend, while the $🥩 is the result of that lend. So it is a representation of their stake.

Let's start with this, how can our program mint 🥩 to the user?
![flow-minting.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666109606/mOmsupwS2.png)


So the function signature for staking should look something like this:
```rust
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()>
```

Instead of diving into implementation details, let's see what we expect the `stake` instruction to do from the client's or test's perspective:
```typescript
    it('It swaps $🐮 for $🥩', async () => {
        // 1. Get user current stake amount
        const userStakes = await user.stakeBalance();

        // 2. Execute our stuff
        await program.rpc.stake(
	        ...,
	        new anchor.BN(5)}
	    );

        // 3. After:
        // We expect the user to have received 5 $🥩 
        expect(await user.stakeBalance()).to.be.eql((await user.stakeBalance()) + 5);
        
    });
```


Let's try to implement `stake` on the rust side:
```rust
use anchor_spl::token::{self, Mint, Token};


#[program]  
pub mod staking {
	fn stake(ctx: Context<Stake>, beef_amount: u64) -> Result<()> {
	
		// don't worry about the math for now
		let stakeAmount = beef_amount; 
		
		let cpi_ctx = CpiContext::new_with_signer(  
			// SPL Token Program's public address, to reference it
			ctx.accounts.token_program.to_account_info(),
	
			// The Arguments for the MintTo Instruction.
			token::MintTo {  
				mint: // ?,  
				authority: // ?,
				to: // ?,  
			},  
			&signer,  
		);
		token::mint_to(cpi_ctx, stakeAmount);

		Ok(())
	}
}


pub struct Stake<'info> {  
    // SPL Token Program.  
	pub token_program: Program<'info, Token>,
}
	
```
- `anchor_spl::token::` is the SPL Token Program. We will see very soon what it is.
- Minting Tokens is done using *Cross-Program Invocation*. This cult-like word just means calling another program. In that case, we are asking the SPL Token Program to do the minting.
- In the same way, our own program's instructions take context arguments, calling another program also takes context arguments. The `mint_to` instruction is defined by anchor [here](https://docs.rs/anchor-spl/0.5.0/anchor_spl/token/struct.MintTo.html).


This is what our discussion (CPI) with the SPL Token Program looks like:
![cpi-discussion.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666158369/5bPWj6oSo.png)
Ok, let's regroup and figure out what the Token Program wants:
- It's telling us that it needs a mint. It needs to know where to find out about 🥩 . Our token doesn't exist yet. Let's cook that token ingredient!
- It also says that it doesn't send to wallets directly. We will discover later what ingredient we will need to make the token program happy.


**🏆 Achievement: Minting Flow**

If you have arrived here, then you are done. Congratulations! I am half-joking, but what I have shown you above _is_ essentially how minting works. Now it's about completing these CPIs arguments by feeding them with the correct accounts ingredients.

From now on, our mission will be to prepare the arguments for this:
```rust
token::MintTo {  
	mint: // ?
	authority: // ?
	to: // ?
}, 

```

---

# 🥩 Pair-Progra-Cooking The Minting Part

**Check list - `MintTo.mint:`**

Our goal is to provide the necessary ingredients for the Token Program to do the mint:
```rust
token::MintTo {  
	mint: // NOW
	authority: // later
	to: // later
}, 
```
- [ ] `mint`: we need to inform the Token Program what kind of token we want to print.
- [ ] `authority`: later.
- [ ] `to` later.


### 🥒 First Ingredient - SPL Token 🪙
We need to prepare accounts to complete the minting of 🥩 for our staking instruction. As we saw earlier, we haven't created our token yet. So, let's chop a token mint.

**🧙‍♀️ Switching hat to the Solana magician:**

The tokens need to exist before even letting users stake 🐮  or receive 🥩. The tokens need to exist first! So, before implementing our staker program, we need to work with the Solana blockchain. 

The way to create a Solana Token Program (commonly called SPL Token) is to nicely ask the [SPL Token Program](https://spl.solana.com/token) to register our $beef and $stake token mint definition.

> What does SPL mean? It stands for Solana Program Library -> "read Solana Helper Programs."

> Traditionally, a **mint** is an industrial facility that [manufactures](https://en.wikipedia.org/wiki/Manufacturing "Manufacturing") [coins](https://en.wikipedia.org/wiki/Coin "Coin") that can be used as [currency](https://en.wikipedia.org/wiki/Currency "Currency")

![creating-a-spl-token.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666206351/gORuLsLXG.png)


**Oh, Grand Token Program, could you please register my new token mint?**

We need to ask the *SPL Token Program* to register our new 🐮 and 🥩  mints. We can do so using the [spl-token-cli](https://spl.solana.com/token#setup) tool or the [@solana/SPL-token javascript library](https://solanacookbook.com/references/token.html#how-to-create-a-new-token). Again, this needs to happen independently from our program. To make our life easier with the management of keys and addresses, let's use the js library.


**A Reminder on Accounts**

In Solana, everything is ... so token mint is ... -> In Solana, everything is an account, so a token mint is also an account!

We will see how to create the stake mint in the next section. Even though the stake mint account doesn't exist yet, you must create an address for it beforehand.

Remember to not confuse yourself between an account and an address. An account is the data structure in Solana, while the address is how you reference it. An account is a buffer, and an address is how you reference that buffer. It is just a keypair.


**Creating an SPL Token Mint with the JS Library**

**🧙‍♀️ Remember, we are switching to the Solana magician hat here because the mint needs to be created even before our stake program exists.**

First, let's create 3 new keypairs, make sure to not commit these to Github:
```shell
solana-keygen new --outfile .keys/beef_mint.json
solana-keygen new --outfile .keys/stake_mint.json
```
- We prepare two keys for the mints so that we can identify them by their public address.
- We also need another key to set the owner of these mints.

With these keypairs, we can ask the *SPL Token Program* to materialize accounts for them.  I have created a helper script to do so in `scripts/create_mints.ts`: 
```typescript
import { createMint } from "@solana/spl-token";  
import {  
	beefMintKeypair,  
	stakeMintKeypair,  
	connection,  
	randomPayer,  
	getStakeMintAuthority,  
} from "./config";


  
const createMints = async () => {  
    const beefMintAddress = await createMintAcct(  
		beefMintKeypair,  // .keys/beef_mint.json
		beefMintKeypair.publicKey  
	 )  
  
    const [stakePDA, _] =  await getStakeMintAuthority();
	// Same as:
	// const [stakePDA, stakePDABump] = await PublicKey.findProgramAddress(  
	//     [stakeMintAddress.toBuffer()], 
	//     program.programId
	// );  
	const stakeMintAddress = await createMintAcct(  
	    stakeMintKeypair,  // .keys/stake_mint.json
		stakePDA // see diagram below to understand why we are doing this
	)  
  
    console.log(`🐮 beef Mint Address: ${beefMintAddress}`);  
	console.log(`🥩️ stake Mint Address: ${stakeMintAddress}`);  
}  
  
  
  
const createMintAcct = async (
	keypairToAssign: Keypair,
	authorityToAssign: PublicKey): Promise<PublicKey> => {  
    return await createMint(  
	    ...
		authorityToAssign, // mint authority  
		keypairToAssign // address of the mint
		...
	 );  
}

export {  
    createMints  
}
```
- Creating a SPL Token is done using the `createMint` [instruction](https://solanacookbook.com/references/token.html#how-to-create-a-new-token)
- `keypairToAssign`: we are using the keypair we generated for the addresses of the soon-to-be-created mint account address.


**PDA as Mint Authority**

`authorityToAssign`: Mints have authority -> "read who owns that mint, who can print from that mint, who can destroy this currency." 

- For the 🐮 beef mint, we need to ask ourselves, who should be able to print $beef tokens? It is not the staker program, nor is it the user. So for the authority, we can leave it as `beefMintKeypair.publicKey`, or you could use another `keypair` controlled by dev.
- For the 🥩  stake mint, who should be able to print $stake tokens? The answer is the program. It should mint $stake to the users upon calling the `stake` function. For that reason, the `authority` of the stake mint should be the program.

How do we achieve this? Accounts owned by programs need program-derived addresses. For this program derived address, we want to make sure it is related to the address of the 🥩 mint:
![pda-signing.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666233618/48VQ7Cxpi.png)


**🏆 Achievement:**

Yes! We now have our 🐮 and 🥩  tokens. I know what you are thinking. We haven't named them yet. Solana does not care about the name of your token. It just cares about how to identify them and own them; that's why we created the keypairs previously. Naming will come later.


#### Deploying A SPL Token
Now the question is, when do we need to call this script? For testnet or the mainnet, you would need to call this script once before deploying your program. To be clear, when I say you, it means the dev.

However, we will deploy the token mint during the tests to make our life easier. Otherwise, you would need to `yarn create-mints` every time before running the tests. Open `scripts/staker.ts` and let's add this create mints step:
```typescript
...
import { createMints } from "../scripts/create-mints";


describe("staking", () => {  
  
    before(async () => {  =
		await createMints();
	});
	
	...
}
```

```
🐮 beef Mint Address:: AXyTBL1C48WEdpzpY4bcDNsG4B2N918zy2cYsiQFKGBf
🥩️ stake Mint Address: 9FgzyMYYiQew42BdVjsKNHUeXDpP4CaK1rFLMQndf1xE
```


#### Rust - Using The Mint

Now that the mint account is created and living in Solana, we can complete the `MintTo.mint`:
```
token::MintTo {  
	mint: ctx.accounts.stake_mint.to_account_info(),
	authority: // later
	to: // later
}, 
```

`programs/staking/src/lib.rs`:
```rust
...
// REPLACE ADDRESS of stake mint by running solana address -k .keys/stake_mint.json  
pub const STAKE_MINT_ADDRESS: &str = "9FgzyMYYiQew42B...";

fn stake(ctx: Context<Stake>, beef_amount: u64) -> Result<()> {
	...
	
	let cpi_ctx = CpiContext::new_with_signer(  
		// SPL Token Program's public address, to reference it
		ctx.accounts.token_program.to_account_info(),

		// The Arguments for the MintTo Instruction.
		token::MintTo {  
			mint: ctx.accounts.stake_mint.to_account_info(),
			authority: 
			to: // ? user.something.to_account_info,  
		},  
		// ?,  
	);

	...
}


pub struct Stake<'info> {  
    // Address of the token program
	pub token_program: Program<'info, Token>,


	// Address of the stake mint 🏭🥩  
	#[account(  
		mut,  
		address = STAKE_MINT_ADDRESS.parse::<Pubkey>().unwrap(),  
	)]  
	pub stake_mint: Account<'info, Mint>,  
}
```
- We define the `stake_mint` as `mut` since we will alter the supply when we mint.

Make sure to replace `STAKE_MINT_ADDRESS.` You can find that address by running:
```shell
solana address -k .keys/stake_mint.js
```


#### Client-Side - Feeding Accounts
`tests/staker.ts`:
```typescript
...
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { program, stakeMintAddress } from "../scripts/config"
import { createMints } from "../scripts/create-mints";


describe("staking", () => {  
  
    before(async () => {  =
		await createMints();
	});
	

	it('Swap $🐮 for $🥩', async () => {
		
		await program.rpc.stake(
			new anchor.BN(5_000),
			{
				accounts: {
					tokenProgram: TOKEN_PROGRAM_ID,
					stakeMint: stakeMintAddress
				}
			}
		);
		
	});
}
```
- `tokenProgram` Solana is lost: "*where is my spl program friend?*"
- `stakeMint`: Token Program asks: "*what type of token am I supposed to print?*"



**🙋 Quiz Time:**

- [ ] Why do we need to explicitly specify the address of the `stake_mint`?

**👀  Answer:**

It is to assert that the `stake_mint` is not a random mint address. On the client-side, if someone gave the mint of another token, your staker program would not be minting 🥩  anymore but some random coin!

> In Ethereum, during deployment of the contract, you would inject the address of your ERC20 token and store it as a variable. Solana programs do not maintain state. So they cannot hold such reference to your token contract. This introduces two changes:
> 1. Instead, the token "contract" reference must be passed on for every instruction/transaction.
> 2. We need to use PDA to ensure the mint authority is set to the program (more on this below).



### 🥒 Second Ingredient - PDA Signing ✍️

**Check list: `MintTo::authority`**

```rust
token::MintTo {  
	mint: ctx.accounts.stake_mint.to_account_info(),
	authority: // NOW
	to: // later
}, 
```
- [x] `mint`: we need to inform the Token Program what kind of token we want to print.
- [ ] `authority`: The Token Program wants the 🔑 to be able to print from that mint.


#### Who's Your Daddy (Or Mommy)?

We need to prove to the Token Program that when we ask to mint some stake, we have the `authority` to do so. Proving that we own something in the blockchain world is done using signing.

⚠️ Take a deep breath because we are entering the most challenging part of the article.
Signing is very delicate. It's like preparing some poisonous [fugu](https://en.wikipedia.org/wiki/Fugu) sashimi. If you are a bit off, the recipe becomes deadly, and you would end up in a cryptographic nightmare blackhole for hours wondering what error is Solana talking about.

**Let's rewind a bit, *"FX: people walking back à-la tenet"*: 🚶🏻‍♂️🚶🏽🚶‍♀️**


Remember this diagram?
![pda-signing.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666233618/48VQ7Cxpi.png)
- That is how we set the authority of the stake mint.
- The authority of the stake mint is a PDA.
- That PDA with `stakingProgramId` + `stakeMint.address`.

The above diagram described in pseudo code:
```typescript
stakeMintPDA = programId + stakeMint.address
stakeMint.authority = stakeMintPDA
```

The same again in js (we already did this when we created the stakeMint account):
```typescript
   const [stakePDA, _] =  await getStakeMintAuthority();
	// Same as:
	// const [stakePDA, stakePDABump] = await PublicKey.findProgramAddress(  
	//     [stakeMintAddress.toBuffer()], 
	//     program.programId
	// );  
	const stakeMintAddress = await createMintAcct(  
	    stakeMintKeypair,  // .keys/stake_mint.json
		stakePDA // see diagram above to understand why we are doing this
	)
```


Hopefully, this makes sense, don't worry if you can't wrap your head around it at the first shot. Just remember that the authority of the `stakeMint` is not a traditional private key but a PDA. And PDAs, by nature, do not have private keys.


#### From Outside - Feeding Authority

When we created the stake mint, I already had a helper to create that PDA. Let's use it:
```typescript
...
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { 
	program,
	stakeMintAddress,
	findStakeMintAuthorityPDA
} from "../scripts/config"
import { createMints } from "../scripts/create-mints";



describe("staking", () => {  
  
	...

	it('Swap $🐮 for $🥩', async () => {

		const [stakePDA, stakePDAbump] = await findStakeMintAuthorityPDA(); // NEW
		
		await program.rpc.stake(
			stakePDAbump, // NEW
			new anchor.BN(5_000),
			{
				accounts: {
					tokenProgram: TOKEN_PROGRAM_ID,
					stakeMint: stakeMintAddress,
					stakeMintAuthority: stakePDA // NEW
				},
			}
		);
		
	});
}
``````
- `findStakeMintAuthorityPDA` we use this helper to get the PDA we designed before.
- We feed the first part of the PDA to our program via the `stakeMintAuthority.`
With `stakePDAbump,` a PDA comes in two parts, the PDA + bump (or nonce).


#### Rust - Using The Authority

Let's start by the `Context<Stake>`:
```rust
#[derive(Accounts)]  
#[instruction(stake_mint_authority_bump: u8)]  // NEW
pub struct Stake<'info> {  
	// SPL Token Program  
	pub token_program: Program<'info, Token>,  
  
	// Address of the stake mint 🏭🥩  
	#[account(  
		mut,  
		address = STAKE_MINT_ADDRESS.parse::<Pubkey>().unwrap(),  
	)]  
	pub stake_mint: Account<'info, Mint>,  


	// The authority allowed to mutate the above ⬆️  
	// And Print Stake Tokens  
	/// CHECK: only used as a signing PDA  
	#[account(  
		seeds = [ stake_mint.key().as_ref() ],  
		bump = stake_mint_authority_bump,  
	)]  
	pub stake_mint_authority: UncheckedAccount<'info>
}
```
- `seeds` and `bump` tell anchor this is a PDA.
- `seeds`: is set to the stakeMintAddress.
- `bump` is provided via the newly added `#[instruction(stake_mint_authority_bump: u8)]`.

Now, the `stake` implementation:
```rust
pub fn stake(  
	ctx: Context<Stake>,  
	stake_mint_authority_bump: u8,  
	beef_amount: u64  
	) -> Result<()> {  
 
  
	 let stake_amount = beef_amount; // For now 1 $beef = 1 $stake  
  
  
	 let cpi_ctx = CpiContext::new_with_signer(  
		ctx.accounts.token_program.to_account_info(),  
		token::MintTo {  
			mint: ctx.accounts.stake_mint.to_account_info(),  
			authority: ctx.accounts.stake_mint_authority.to_account_info(), // NEW
			to: // later 
		},
	);

	token::mint_to(cpi_ctx, stake_amount)?;

	Ok(())
}
```


#### And Now A Little Algreba!
Are we done? No. Why is that?

🧐 Don't you find it strange that we are proving the authority of the stakeMint with a *public address*? Public means everyone can use it. We even gave that *public* address from the client side! If that were enough to mint tokens, that would be a disaster because it would mean anyone with a public address would be able to print tokens freely 🤑.

As we said earlier, in blockchains, ownership or control is proven via signing ✍️. So, for example, we prove ownership of it via the matching private key given a public address. 

**PDA Signing**

1. Token Program.
2. The `token::MintTo` struct.
3. Lastly, a signer.

The [Anchor Book](https://book.anchor-lang.com/chapter_3/PDAs.html#programs-as-signers) explains how to solve our problem:
> PDAs are not public keys, so they can't sign anything. However, PDAs can still pseudo-sign CPIs. To sign with a PDA, you must change `CpiContext::new(cpi_program, cpi_accounts)` to `CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds)` where the `seeds` argument is the seeds _and_ the bump the PDA was created with.

When the `token::mint_to` wil be invoked with its context. It will check if `authority: ctx.accounts.stake_mint_authority` can be pseudo-signed.

Pseudo sign meaning it will try to find back the PDA we generated. For example, look at this pseudo algebra magic:
```
// We know that:  
// PDA         , BUMP             = findPDA(programId + seed)  
// stakeMintPDA, stakeMintPDABump = findPDA(programId + stakeMint.address)  
  
// -> So signer can be found using:  
// findPDA(programId + seed)              = X + bump  
// findPDA(programId + stakeMintAddress)  = X + bump
```

So, we just need to provide the variables we know about the equation, which are the bump, the seed of the PDA, and the programId (programId doesn't need to be provided):

The brutal rust code:
```rust
let stake_mint_address= ctx.accounts.stake_mint.key();  
let seeds = &[stake_mint_address.as_ref(), &[stake_mint_authority_bump]];  
let signer = [&seeds[..]];  
  
let cpi_ctx = CpiContext::new_with_signer(  
	...
	token::MintTo {  
		mint: ...
		authority: ...
		to: ...
	},  
	&signer // NEW
);
```

🤯 I agree. The syntax and the logic are pretty obscure. The [Solana Doc](https://docs.solana.com/developing/programming-model/calling-between-programs#program-signed-accounts) and the [Anchor Book](https://book.anchor-lang.com/chapter_3/PDAs.html#programs-as-signers) explains it like this:
> When the CPI is invoked, for each account in `cpi_accounts,` the Solana runtime will check whether `hash(seeds, current_program_id) == account address` is valid. If yes, that account's `is_signer` flag will be turned to true.


#### PDA Signing - The Magic Sauce
```rust
pub fn stake(  
		ctx: Context<Stake>,  
		stake_mint_authority_bump: u8,  
		beef_amount: u64  
	) -> Result<()> {  

		let stake_amount = beef_amount; // For now 1 $beef = 1 $stake  
		
		let seeds = &[stake_mint_address.as_ref(), &[stake_mint_authority_bump]];  
		let signer = [&seeds[..]];  
		
		let cpi_ctx = CpiContext::new_with_signer(  
			ctx.accounts.token_program.to_account_info(),  
			token::MintTo {  
				mint: ctx.accounts.stake_mint.to_account_info(),  
				authority: ctx.accounts.stake_mint_authority.to_account_info(),  
				to: ... // not yet :(  
			},  
			&signer  
		);  
		token::mint_to(cpi_ctx, stake_amount)?;  
		
		Ok(())  
	}  
}
```


**🏆 Achievement:**

💪 Pat yourself on the back for me! I know this last part was brutal. That was the most challenging part of the article, actually. But if you have followed so far, be proud of yourself because it's not just some tedious code you are learning. The code is not the point. You are learning why things happen.

You now master:
- Program Address Derivation to prove the ownership of another address.
- Cross Program Invocation with Pseudo Signing.


### 🥒  Third Ingredient - Token Bags 💰

**Check list: `MintTo::authority`**

```rust
token::MintTo {  
	mint: ctx.accounts.stake_mint.to_account_info(),
	authority: ctx.accounts.stake_mint_authority.to_account_info(),  
	to: // NOW
}, 
```
- [x] `mint`: we need to inform the Token Program what kind of token we want to print.
- [x] `authority`: The Token Program wants the 🔑 to be able to print from that mint.
- [ ] `to`: Token Program says it doesn't send tokens to wallets! After completing this part, we will finally be able to mint 🥩  to our users!


#### Token Program Loves Gucci
![cpi-discussion-2.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666345705/FQre-JgD9.png)


#### Token Bags = Owner + Mint
The Token Program still does not want to do the mint! So we need to discuss something. Although we can simply send $sol to wallets in Solana, we cannot send SPL tokens (custom tokens) directly to a wallet address.

A wallet needs to have an *Associated Token Account* setup to receive a custom token. I will refer to *Associated Token Account* as *token bags* 💰 from now on. You can read more about the ATAP here: https://spl.solana.com/associated-token-account. What's important is that a Token Bag belongs to a user and holds a specific type of token.

> Why is it called **Associated** Token Account? Then, we can derive the mapped token accounts addresses given a wallet address. That's why!


![token-bag.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666387162/UAe0yEdoH.png)


#### Accounts, Accounts, and Accounts!
Before I lose you, let's clarify the difference between token bags (token accounts) and token mints:
- Previously, we registered *token mints* 🏭 which are factories to produce SPL tokens.
We know that *token bags* 💰 are used to hold SPL Tokens.

![token-bag-2.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1648666423596/dOZF-INMI.png)


#### Revenge Of The Mints

**Why do we care?**

This is great and pretty, but why do we need this? Because if we want to send 🐮 or 🥩 to the users, we need to first create the corresponding 🐮 bags or 🥩 bags for users.

To create a token bag we need: `owner + mint` and call `getOrCreateAssociatedTokenAccount` from the `@solana/spl-token` :
```typescript
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";


const getOrCreateStakeTokenBag = async (): Promise<Account> => {
	return await getOrCreateAssociatedTokenAccount(  
		some_connection,  
		payer_for_the_account_rent,
		address_of_mint_this_token_bag_is_for,
		address_of_user_wallet
	);
}
```

But don't copy the above code. I have already prepared helpers to glue all the addresses together. Just jump back to  `scripts/staker.ts,` and let's create the token bags and add a new step: `// 0. Prepare Token Bags`:
```typescript
...
import { User } from "./user";



describe("staking", () => {  
	...

    it('Swap $🐮 for $🥩', async () => {
	    // 0. stakeMintAuthority = PDA with stakeMint as seed
		const [stakePda, stakeBump] = await findStakeMintAuthorityPDA(); 

		// 1. Prepare Token Bags  
		const user =  new User();  
		await user.getOrCreateStakeTokenBag();  
		  
		// 2. Get current stake amount  
		const userStakes = await user.stakeBalance();  
		  
		// 3. STAKE!
		await program.rpc.stake(  
			stakeBump,  
			new anchor.BN(5_000),  
			{  
				accounts: {  
					// Solana is lost: where are my spl program friends?  
					tokenProgram: TOKEN_PROGRAM_ID,  
					
					// Token Program asks: 🏭 what type of token am I supposed to print?
					stakeMint: stakeMintAddress,  
					
					// Token Program asks:
					// ✍️ who is allowed to print tokens from stakeMint? 
					stakeMintAuthority: stakePda,  
					
					// 💰🥩 Token Program wonders: "where should I mint this to?" 
					userStakeTokenBag: user.stakeTokenBag,  
				}
			}    
		);
	});
}
```


Finally we can complete the `to:`, let's make use of that token bag in `program programs/staking/lib.rs`:
```rust
#[program]
pub mod staking {
	pub fn stake(  
		ctx: Context<Stake>,  
		stake_mint_authority_bump: u8,  
		beef_amount: u64  
	) -> Result<()> { 
	
		...
		
		token::MintTo {  
			...
			to: ctx.user_stake_token_bag.to_account_info(),  
		}
		
		...
	}
}

#[derive(Accounts)]
#[instruction(stake_mint_authority_bump: u8)]
pub struct Stake<'info> {
	...
	// Associated Token Account 💰 for User to receive 🥩
	#[account(mut)]
	pub user_stake_token_bag: Account<'info, TokenAccount>,
}
```
- Don't forget to add the `#[account(mut)]` to specify that we should be able to mutate that account.


Run the test👏  `anchor test`:
```shell
🐮 beef Mint Address: AXyTBL1C48WEdpzpY4...
🥩️ stake Mint Address: 9FgzyMYYiQew42BdVjs...
    ✔ Swap $🐮 for $🥩 (1600ms)


  1 passing (3s)
```

Checkpoint code in this branch: https://github.com/mwrites/solana-staker/tree/feature/stake-mint


### 🏆 Achievement: Minting

🚀 Let's go! You just finished the minting part of stake!!! You had to learn a few ingredients to make it happen:
- 🥒 First ingredient: how to create a token mint.
- 🥒 Second ingredient: how to do PDA signing.
- 🥒 Third ingredient: how to send SPL tokens to associated token accounts.

Learning how to mint is helpful, but more than that, you learned a few key Solana ingredients that can help you make new dishes later!




---

# 🎓 Review & EVM Comparison

**The Consequence Of Accounts**

Comparing with the [solidity version](https://solidity-by-example.org/defi/staking-rewards/). You might notice that the Solana version is much more involved. If we can resume it in one word, that word is *Accounts*. You might have seen the phrase *" Solana programs are stateless"*. It took me a while to really, I mean, really understand what this involves. Basically, it means programs are dumb!

So, programs don't know anything. They are just machine processing data. So when you want to talk to programs, you want them to process something. But they have no idea what data you are talking about, so because of that, you need to always provide everything to these processors:

1. The first consequence of this is that data (accounts) need to be provided with each instruction, which makes the code longer to write.
2. The second consequence is that because accounts are independent of programs, they need to be signed for access control, which again makes the code longer to write.

**It's not just program->accounts, it's program->accounts->signer**

Because of these two reasons, accounts introduce a new depth. For example, when you want to talk to a program, you want to give an account and not only the account but also the account's signer. So whenever you want to do something, you first need to get the accounts and make sure you have the appropriate signing in place. Then, finally, you can do something with the account.


**ERC20 Contracts**

The equivalent to ERC20 contracts in Solana is SPL Tokens. However, SPL Tokens are not smart contracts but accounts. So instead of creating a new smart contract (program), we register a new account that defines our token with the SPL Token Program, the centralized authority for managing tokens.


**Associated Token Accounts or Token Bags**

While in EVM, token balance is handled by the ERC20 smart contract, it is not managed by a program in Solana. Indeed, the token balance lives in something like a *token bag*, and that token bag is owned by the user, not the system or your smart contract!


**PDA Signing**

Since accounts live outside programs, signing is used to determine who has control of an account. Sometimes though. You want only your program to own such an account. This is achieved by PDA Signing, it is pretty finicky, but you will get used to it with time.


**Rent**

Finally, we need to pay rent for the space accounts occupied in Solana. The rent is usually paid by the signer of the transaction. Because space needs to be paid, we are incentivized as developers to make accounts are small and granular as possible.



----

# 👉🏻 Part 2 Of Hell's Kitchen

🏎 From now on, it will be much faster since you have already mastered the key ingredients. So take a little break before tackling the next part of staking, the transfer of 🐮 from the users (the payment).

When you are ready, meet you in part 2 (I need to find the link to part2 lol)

