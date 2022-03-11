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
        deed.withdrawal_period = 2 * 3600 * 24; // Day-to-second conversion
        deed.left_to_be_shared = 100;
        deed.last_seen = clock.unix_timestamp;

        Ok(())
    }

    pub fn edit_withdrawal_period(ctx: Context<EditDeed>, withdrawal_period: i64) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let clock: Clock = Clock::get().unwrap();

        deed.withdrawal_period = withdrawal_period; // Day-to-second conversion
        deed.last_seen = clock.unix_timestamp;

        Ok(())
    }

    pub fn edit_owner(ctx: Context<EditDeed>, new_owner: Pubkey) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let clock: Clock = Clock::get().unwrap();

        deed.owner = new_owner;
        deed.last_seen = clock.unix_timestamp;

        Ok(())
    }

    pub fn delete_deed(_ctx: Context<DeleteDeed>) -> ProgramResult {
        Ok(())
    }

    pub fn add_emergency(ctx: Context<AddEmergency>, receiver: Pubkey, percentage: u8) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let owner: &Signer = &ctx.accounts.owner;
        let clock: Clock = Clock::get().unwrap();

        deed.last_seen = clock.unix_timestamp;
        deed.left_to_be_shared -= percentage;

        emergency.owner = *owner.key;
        emergency.receiver = receiver;
        emergency.percentage += percentage;
        emergency.withdrawal_period = deed.withdrawal_period;
                
        Ok(())
    }

    pub fn delete_emergency(ctx: Context<DeleteEmergency>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;

        deed.left_to_be_shared += emergency.percentage;

        Ok(())
    }

    pub fn claim_emergency(ctx: Context<ClaimEmergency>) -> ProgramResult {
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let clock: Clock = Clock::get().unwrap();

        if emergency.claimed_timestamp > 0 {
            return Err(NotarizErrorCode::ClaimTimestampGreaterThanZeroError.into())
        }

        emergency.claimed_timestamp = clock.unix_timestamp;

        Ok(())
    }

    pub fn redeem_emergency(ctx: Context<RedeemEmergency>) -> ProgramResult {
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let clock: Clock = Clock::get().unwrap();

        if emergency.claimed_timestamp == 0 {
            return Err(NotarizErrorCode::ClaimTimestampEqualsToZeroError.into())
        }

        if clock.unix_timestamp - emergency.claimed_timestamp < emergency.withdrawal_period {
            return Err(NotarizErrorCode::RedeemTimestampError.into())
        }

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
pub struct EditDeed<'info> {
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>
}

#[derive(Accounts)]
pub struct DeleteDeed<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub deed: Account<'info, Deed>,
    pub owner: Signer<'info>
}

#[derive(Accounts)] 
pub struct AddEmergency<'info> {
    #[account(init, payer = owner, space = Emergency::LEN)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>
}

#[derive(Accounts)] 
pub struct DeleteEmergency<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>
}

#[derive(Accounts)] 
pub struct ClaimEmergency<'info> {
    #[account(mut, has_one = receiver)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>
}

#[derive(Accounts)] 
pub struct RedeemEmergency<'info> {
    #[account(mut, has_one = receiver, close = receiver)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>
}

#[account]
#[derive(Default)]
pub struct Deed {
    pub owner: Pubkey,
    pub last_seen: i64,
    pub left_to_be_shared: u8, // Percentage comprised in [1;100]
    pub withdrawal_period: i64, // In seconds (up to 136 years)
}

const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const WITHDRAWAL_PERIOD_LENGTH: usize = 8;
const LEFT_TO_BE_SHARED_LENGTH: usize = 1;
const DISCRIMINATOR_LENGTH: usize = 8;

impl Deed {
    const LEN: usize =
    DISCRIMINATOR_LENGTH
    + PUBLIC_KEY_LENGTH 
    + LEFT_TO_BE_SHARED_LENGTH
    + TIMESTAMP_LENGTH 
    + WITHDRAWAL_PERIOD_LENGTH;
}

#[account]
#[derive(Default)]
pub struct Emergency {
    pub owner: Pubkey,
    pub receiver: Pubkey,
    pub percentage: u8,
    pub withdrawal_period: i64,
    pub claimed_timestamp: i64
}

const EMERGENCY_LENGTH: usize = 81; // 32 + 32 + 1 + 8 + 8;

impl Emergency {
    const LEN: usize = 
    DISCRIMINATOR_LENGTH +
    EMERGENCY_LENGTH;
}

#[account]
#[derive(Default)]
pub struct Recovery {
    pub owner: Pubkey,
    pub receiver: Pubkey
}

const RECOVERY_LENGTH: usize = 16; // 8 + 8

impl Recovery {
    const LEN: usize =
    DISCRIMINATOR_LENGTH +
    RECOVERY_LENGTH;
}


#[error]
pub enum NotarizErrorCode {
    #[msg("This emergency has already been claimed.")]
    ClaimTimestampGreaterThanZeroError,
    #[msg("This emergency has yet to be claimed.")]
    ClaimTimestampEqualsToZeroError,
    #[msg("This emergency cannot be redeemed yet.")]
    RedeemTimestampError
}