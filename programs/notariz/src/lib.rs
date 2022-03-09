use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod notariz {
    use super::*;
    pub fn create_deed(ctx: Context<CreateDeed>) -> ProgramResult {
        let my_deed = &mut ctx.accounts.deed;
        let clock: Clock = Clock::get().unwrap();
        my_deed.owner = ctx.accounts.owner.to_account_info().key();
        my_deed.withdrawal_period = 2;
        my_deed.left_to_be_shared = 100;
        my_deed.last_seen = clock.unix_timestamp;
        Ok(())
    }

    pub fn add_emergency(_ctx: Context<EditDeed>, _emergency_address: Pubkey, _percentage: u16) -> ProgramResult {
        // let my_deed = &mut ctx.accounts.deed;
        // require!(my_deed.owner == ctx.accounts.owner.key(), NotarizError::DeedOwnershipFailure);
        
        Ok(())
    }
}



#[derive(Accounts)]
pub struct CreateDeed<'info> {
    #[account(init, payer = owner, space = 1000)]
    pub deed: Account<'info, MyDeed>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct EditDeed<'info> {
    #[account(mut)]
    pub deed: Account<'info, MyDeed>,
    pub owner: Signer<'info>
}

#[account]
#[derive(Default)]
pub struct MyDeed {
    pub owner: Pubkey,
    pub last_seen: i64,
    pub left_to_be_shared: u8, // Percentage comprised in [1;100]
    pub withdrawal_period: u32, // In seconds (up to 136 years)
    pub emergencies: Vec<Emergency>,
    pub recoveries: Vec<Recovery>
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


