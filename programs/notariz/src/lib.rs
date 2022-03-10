use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

declare_id!("DFtRYEj6CB8xF6MkukkqnCxgiku7K2cJbSxsaHQWogdE");

#[program]
pub mod notariz {
    use super::*;
    pub fn create_deed(ctx: Context<CreateDeed>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let owner: &Signer = &ctx.accounts.owner;
        let clock: Clock = Clock::get().unwrap();
        
        deed.owner = *owner.key;
        deed.withdrawal_period = 2;
        deed.left_to_be_shared = 100;
        deed.last_seen = clock.unix_timestamp;
        Ok(())
    }

    pub fn delete_deed(_ctx: Context<DeleteDeed>) -> ProgramResult {
        Ok(())
    }

    pub fn add_emergency(_ctx: Context<EditDeed>, _emergency_address: Pubkey, _percentage: u16) -> ProgramResult {
        // let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        
        // require!(my_deed.owner == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateDeed<'info> {
    #[account(init, payer = owner, space = Deed::LEN)] // The deed owner pays for the deed account's rent
    pub deed: Account<'info, Deed>,
    #[account(mut)] // Defines the amount of money stored in a deed account as mutable 
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct DeleteDeed<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub deed: Account<'info, Deed>,
    pub owner: Signer<'info>
}

#[derive(Accounts)]
pub struct EditDeed<'info> {
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>
}

#[account]
#[derive(Default)]
pub struct Deed {
    pub owner: Pubkey,
    pub last_seen: i64,
    pub left_to_be_shared: u8, // Percentage comprised in [1;100]
    pub withdrawal_period: u32, // In seconds (up to 136 years)
    pub emergencies: Vec<Emergency>,
    pub recoveries: Vec<Recovery>
}

const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const WITHDRAWAL_PERIOD_LENGTH: usize = 4;

const EMERGENCY_PREFIX_LENGTH: usize = 4; // We store a prefix defining the unknown array size containing emergencies
const EMERGENCY_LENGTH: usize = 25; // 8 + 1 + 8 + 8;

const RECOVERY_PREFIX_LENGTH: usize = 4; // We store a prefix defining the unknown array size containing recoveries
const RECOVERY_LENGTH: usize = 9; // 8 + 1

impl Deed {
    const LEN: usize = 
    PUBLIC_KEY_LENGTH 
    + TIMESTAMP_LENGTH 
    + WITHDRAWAL_PERIOD_LENGTH
    + EMERGENCY_PREFIX_LENGTH 
    + EMERGENCY_LENGTH
    + RECOVERY_PREFIX_LENGTH
    + RECOVERY_LENGTH;
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Emergency {
    pub receiver: Pubkey,
    pub percentage: u8,
    pub claimed_timestamp: i64,
    pub redeemed_timestamp: i64
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Recovery {
    pub receiver: Pubkey,
    pub redeemed: bool
}

#[error]
pub enum NotarizErrorCode {
    #[msg("The user is not the deed's owner.")]
    OwnershipError
}