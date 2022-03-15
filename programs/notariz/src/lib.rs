use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
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

    pub fn withdraw_deed_lamports(
        ctx: Context<WithdrawDeedLamports>,
        lamports_to_send: u64,
    ) -> ProgramResult {

        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;

        let owner: &Signer = &mut ctx.accounts.owner;

        if deed.to_account_info().lamports() < lamports_to_send {
            return Err(NotarizErrorCode::LamportTransferError.into());
        };

        transfer_lamports(&mut deed.to_account_info(), &mut owner.to_account_info(), lamports_to_send)
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
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_emergency(
        ctx: Context<AddEmergency>,
        receiver: Pubkey,
        percentage: u8,
    ) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let owner: &Signer = &ctx.accounts.owner;
        let clock: Clock = Clock::get().unwrap();

        deed.last_seen = clock.unix_timestamp;

        if deed.left_to_be_shared - percentage < 0 {
            return Err(NotarizErrorCode::PercentageError.into());
        }
        deed.left_to_be_shared -= percentage;

        emergency.upstream_deed = deed.key();
        emergency.owner = *owner.key;
        emergency.receiver = receiver;
        emergency.percentage += percentage;
        emergency.withdrawal_period = deed.withdrawal_period;
        
        Ok(())
    }

    pub fn delete_emergency(ctx: Context<DeleteEmergency>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;

        deed.left_to_be_shared += emergency.percentage;

        Ok(())
    }

    pub fn claim_emergency(ctx: Context<ClaimEmergency>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let clock: Clock = Clock::get().unwrap();

        if clock.unix_timestamp - deed.last_seen < deed.withdrawal_period {
            return Err(NotarizErrorCode::DeedWithdrawalTimeout.into());
        }

        emergency.claimed_timestamp = clock.unix_timestamp;

        Ok(())
    }

    pub fn redeem_emergency(ctx: Context<RedeemEmergency>) -> ProgramResult {
        let emergency: &mut Account<Emergency> = &mut ctx.accounts.emergency;
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;

        let clock: Clock = Clock::get().unwrap();
        let receiver: &Signer = &ctx.accounts.receiver;
        let lamports_to_send =
            deed.to_account_info().lamports() * u64::from(emergency.percentage) / 100;

        // if emergency.claimed_timestamp == 0 {
        //     return Err(NotarizErrorCode::ClaimTimestampEqualsToZeroError.into());
        // }

        if emergency.claimed_timestamp < deed.last_seen + deed.withdrawal_period {
            return Err(NotarizErrorCode::ClaimNeededToRedeem.into());
        }

        if clock.unix_timestamp - emergency.claimed_timestamp < emergency.withdrawal_period {
            return Err(NotarizErrorCode::RedeemTimestampError.into());
        }

        transfer_lamports(&mut deed.to_account_info(), &mut receiver.to_account_info(), lamports_to_send);

        Ok(())
    }

    pub fn add_recovery(
        ctx: Context<AddRecovery>,
        receiver: Pubkey,
    ) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        let recovery: &mut Account<Recovery> = &mut ctx.accounts.recovery;
        let owner: &Signer = &ctx.accounts.owner;

        deed.last_seen = Clock::get()?.unix_timestamp;
        recovery.upstream_deed = deed.key();
        recovery.owner = *owner.key;
        recovery.receiver = receiver;

        Ok(())
    }

    pub fn delete_recovery(ctx: Context<DeleteRecovery>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn redeem_recovery(ctx: Context<RedeemRecovery>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;

        let receiver: &Signer = &ctx.accounts.receiver;
        let lamports_to_send = deed.to_account_info().lamports();

        transfer_lamports(&mut deed.to_account_info(), &mut receiver.to_account_info(), lamports_to_send);

        Ok(())
    }

    pub fn keepAlive(ctx: Context<EditDeed>) -> ProgramResult {
        let deed: &mut Account<Deed> = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateDeed<'info> {
    #[account(init, payer = owner, space = Deed::LEN)]
    // The deed owner pays for the deed account's rent
    pub deed: Account<'info, Deed>,
    #[account(mut)] // Defines the amount of money stored in a deed account as mutable
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawDeedLamports<'info> {
    #[account(mut)] // The deed owner pays for the deed account's rent
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EditDeed<'info> {
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteDeed<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
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
    pub system_program: Program<'info, System>,
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
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimEmergency<'info> {
    #[account(mut, has_one = receiver)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut)]
    pub receiver: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemEmergency<'info> {
    #[account(mut, has_one = receiver, close = receiver)]
    pub emergency: Account<'info, Emergency>,
    #[account(mut, address = emergency.upstream_deed)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddRecovery<'info> {
    #[account(init, payer = owner, space = Recovery::LEN)]
    pub recovery: Account<'info, Recovery>,
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteRecovery<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub recovery: Account<'info, Recovery>,
    #[account(mut, has_one = owner)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemRecovery<'info> {
    #[account(mut, has_one = receiver, close = receiver)]
    pub recovery: Account<'info, Recovery>,
    #[account(mut, address = recovery.upstream_deed)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(address = system_program::ID)] // Checks the system program is the actual one
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Deed {
    pub owner: Pubkey,
    pub last_seen: i64,
    pub left_to_be_shared: u8,  // Percentage comprised in [1;100]
    pub withdrawal_period: i64, // In seconds (up to 136 years)
}

const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const WITHDRAWAL_PERIOD_LENGTH: usize = 8;
const LEFT_TO_BE_SHARED_LENGTH: usize = 1;
const DISCRIMINATOR_LENGTH: usize = 8;

const DEED_LENGTH: usize = PUBLIC_KEY_LENGTH
    + TIMESTAMP_LENGTH
    + WITHDRAWAL_PERIOD_LENGTH
    + LEFT_TO_BE_SHARED_LENGTH
    + DISCRIMINATOR_LENGTH;

impl Deed {
    const LEN: usize = DISCRIMINATOR_LENGTH + DEED_LENGTH;
}

#[account]
#[derive(Default)]
pub struct Emergency {
    pub upstream_deed: Pubkey,
    pub owner: Pubkey,
    pub receiver: Pubkey,
    pub percentage: u8,
    pub withdrawal_period: i64,
    pub claimed_timestamp: i64,
}

const PERCENTAGE_LENGTH: usize = 1;

const EMERGENCY_LENGTH: usize =
    3 * PUBLIC_KEY_LENGTH + PERCENTAGE_LENGTH + WITHDRAWAL_PERIOD_LENGTH + TIMESTAMP_LENGTH;

impl Emergency {
    const LEN: usize = DISCRIMINATOR_LENGTH + EMERGENCY_LENGTH;
}

#[account]
#[derive(Default)]
pub struct Recovery {
    pub upstream_deed: Pubkey,
    pub owner: Pubkey,
    pub receiver: Pubkey,
}

const RECOVERY_LENGTH: usize = 3 * PUBLIC_KEY_LENGTH;

impl Recovery {
    const LEN: usize = DISCRIMINATOR_LENGTH + RECOVERY_LENGTH;
}

pub fn transfer_lamports(
    src: &mut AccountInfo, // we better own this account though
    dst: &mut AccountInfo,
    amount: u64,
) -> ProgramResult {
    **src.try_borrow_mut_lamports()? = src
        .lamports()
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidArgument)?;
    **dst.try_borrow_mut_lamports()? = dst
        .lamports()
        .checked_add(amount)
        .ok_or(ProgramError::InvalidArgument)?;
    Ok(())
}

#[error]
pub enum NotarizErrorCode {
    #[msg("The account does not have the lamports it is willing to transfer")]
    LamportTransferError,
    #[msg("You must wait more before to claim.")]
    DeedWithdrawalTimeout,
    #[msg("This emergency has yet to be claimed.")]
    ClaimNeededToRedeem,
    #[msg("This emergency cannot be redeemed yet.")]
    RedeemTimestampError,
    #[msg("Percentage attribution is not compatible with the current deed distribution.")]
    PercentageError,
}
