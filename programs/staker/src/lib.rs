use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod staker {
    // REPLACE ADDRESS of stake mint by running solana address -k .keys/stake_mint.json
    pub const STAKE_MINT_ADDRESS: &str = "9FgzyMYYiQew42BdVjsKNHUeXDpP4CaK1rFLMQndf1xE";
    // REPLACE ADDRESS of beef mint by running solana address -k .keys/beef_mint.json
    pub const BEEF_MINT_ADDRESS: &str = "AXyTBL1C48WEdpzpY4bcDNsG4B2N918zy2cYsiQFKGBf";


    use super::*;


    pub fn stake(
        ctx: Context<Stake>,
        stake_mint_authority_bump: u8,
        beef_amount: u64
    ) -> Result<()> {

        let stake_amount = beef_amount; // ???? FOR NOW!!!

        // We know that:
        //                                  findPDA(programId + seed)
        // stakeMintPDA, stakeMintPDABump = findPDA(programId + stakeMint.address)

        // -> So signer can be found using:
        // findPDA(programId + seed)              = X + bump
        // findPDA(programId + stakeMintAddress)  = X + bump
        let stake_mint_address= ctx.accounts.stake_mint.key();
        let seeds = &[stake_mint_address.as_ref(), &[stake_mint_authority_bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.stake_mint.to_account_info(),
                to: ctx.accounts.user_stake_token_bag.to_account_info(),
                authority: ctx.accounts.stake_mint_authority.to_account_info(),
            },
            &signer
        );
        token::mint_to(cpi_ctx, stake_amount)?;

        Ok(())
    }
}



#[derive(Accounts)]
#[instruction(stake_mint_authority_bump: u8)]
pub struct Stake<'info> {
    // SPL Token Program
    pub token_program: Program<'info, Token>,


    // ***********
    // MINT
    // ***********

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
    pub stake_mint_authority: UncheckedAccount<'info>,

    // Associated Token Account 💰 for User to receive 🥩
    #[account(mut)]
    pub user_stake_token_bag: Account<'info, TokenAccount>,
}
