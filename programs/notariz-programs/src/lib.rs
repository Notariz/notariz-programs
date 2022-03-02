use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod notariz_programs {
    use super::*;

    pub fn open_deed(ctx: Context<OpenDeed>) -> Result<()> {
        let deed = &mut ctx.accounts.deed;
        deed.owner_address = ctx.accounts.owner.key();
        deed.last_seen = Clock::get()?.unix_timestamp; // might be a valid timestamp i guess
        Ok(())
    }

    pub fn keep_alive(ctx: Context<EditDeed>) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn change_total_shares(ctx: Context<EditDeed>, total_shares: u32) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        require!(deed.inheritance.iter().fold(0u32,|acc, item| acc + item.share) <= total_shares, NotarizError::DeedIncompatibleShares);
        deed.total_shares = total_shares;
        Ok(())
    }

    pub fn set_inheritor(ctx: Context<EditDeed>, inheritor: Inheritor) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        let mut is_new = true;
        for i in 0..deed.inheritance.len() {
            if deed.inheritance[i].inheritor_address == inheritor.inheritor_address {
                is_new = false;
                deed.total_shares += inheritor.share - deed.inheritance[i].share; // warning - may leads to bugs
                deed.inheritance[i].share = inheritor.share;
            }
        }
        if is_new {
            deed.last_seen = Clock::get()?.unix_timestamp;
            deed.total_shares += inheritor.share;
            deed.inheritance.push(inheritor);
        }
        Ok(())
    }

    pub fn unset_inheritor(ctx: Context<EditDeed>, address: Pubkey) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        for i in 0..deed.inheritance.len(){
            if deed.inheritance[i].inheritor_address == address {
                deed.inheritance.remove(i);
                return Ok(());
            }
        }
        err!(NotarizError::DeedNoCorrespondingInheritor)
    }

    pub fn set_expiration(ctx: Context<EditDeed>, duration: u32) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        deed.time_until_expiration = Some(duration);
        Ok(())
    }

    pub fn unset_expiration(ctx: Context<EditDeed>) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        deed.time_until_expiration = None;
        Ok(())
    }

    pub fn set_recovery_account(ctx: Context<EditDeed>, key: Pubkey) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        deed.recovery_address = Some(key);
        Ok(())
    }

    pub fn unset_recovery_account(ctx: Context<EditDeed>) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        deed.recovery_address = None;
        Ok(())
    }

    pub fn defer_ownership(ctx: Context<EditDeed>, key: Pubkey) -> Result<()> {
        require!(ctx.accounts.deed.owner_address == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        let deed = &mut ctx.accounts.deed;
        deed.last_seen = Clock::get()?.unix_timestamp;
        deed.owner_address = key;
        Ok(())
    }

}

#[derive(Accounts)]
pub struct OpenDeed<'info> {
    #[account(init, payer = owner, space = 1000)] // space ? to calibrate
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System> // pointless ? idk
}

#[derive(Accounts)]
pub struct EditDeed<'info> {
    #[account(mut)]
    pub deed: Account<'info, Deed>,
    pub owner: Signer<'info>
}

#[account]
#[derive(Default)]
pub struct Deed {
    // TODO: add a SOL storage
    pub owner_address: Pubkey,
    pub recovery_address: Option<Pubkey>,
    pub last_seen: i64, // couldn't find UnixTimestamp location
    pub total_shares: u32,
    pub time_until_expiration: Option<u32>, // seconds
    // hoping there will be no conflict with timestamp (i64) additions
    pub inheritance: Vec<Inheritor>
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Inheritor {
    pub inheritor_address: Pubkey,
    pub share: u32,
}

#[error_code]
pub enum NotarizError {
    DeedOwnershipFailure,
    DeedIncompatibleShares,
    DeedNoCorrespondingInheritor
}