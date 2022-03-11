import * as anchor from '@project-serum/anchor';
import { Program, BN } from '@project-serum/anchor';
import { Notariz } from '../target/types/notariz';
import { expect } from 'chai';
import { base64 } from '@project-serum/anchor/dist/cjs/utils/bytes';
const assert = require('assert');

describe('notariz', () => {
  console.log("🚀 Starting test...")
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Notariz as Program<Notariz>;

  const deedKeypair = anchor.web3.Keypair.generate();
  const deedCreator = program.provider.wallet;
  const newDeedOwner = program.provider.wallet;
  const emergencyReceiver = program.provider.wallet;

  it('🚀 Deed creation', async () => {
    // Add your test here.
    await program.provider.connection.requestAirdrop(deedCreator.publicKey, 1000000000);

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    })

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    assert.ok(deedAccount.withdrawalPeriod.toString() == '172800');
    expect(deedAccount.leftToBeShared).to.equal(100);
    expect(deedAccount.owner).to.eql(deedCreator.publicKey);

  });

  it('🚀 Editing withdrawal period', async () => {
    const withdrawal_period = new BN(10 * 24 * 3600, 10);

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);
    assert.ok(deedAccount.withdrawalPeriod.cmpn(864000) === 0);

  });

  it('🚀 Editing deed owner', async () => {

    await program.rpc.editOwner(newDeedOwner.publicKey, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    expect(deedAccount.owner).to.eql(newDeedOwner.publicKey);

  });

  it('🚀 Deed deletion', async () => {
    const deedKeypair = anchor.web3.Keypair.generate();

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    })

    await program.rpc.deleteDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    const deedAccount = await program.account.deed.fetchNullable(deedKeypair.publicKey);

    expect(deedAccount === null);

  });

  it('🚀 Adding an emergency', async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();

    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [emergencyKeypair]
    });

    let emergencyAccount = await program.account.emergency.fetch(emergencyKeypair.publicKey);

    expect(emergencyAccount.owner).to.eql(deedCreator.publicKey);
    expect(emergencyAccount.receiver).to.eql(emergencyReceiver.publicKey);
    expect(emergencyAccount.percentage).to.equal(percentage);
  });

  it('🚀 Deleting an emergency', async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();

    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [emergencyKeypair]
    });

    await program.rpc.deleteEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      }
    });

    const emergencyAccount = await program.account.emergency.fetchNullable(emergencyKeypair.publicKey);

    expect(emergencyAccount === null);
  });

  it('🚀 Claiming an emergency', async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();
    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [emergencyKeypair]
    });

    await program.rpc.claimEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      }
    });

    let emergencyAccount = await program.account.emergency.fetch(emergencyKeypair.publicKey);
    assert.ok(emergencyAccount.claimedTimestamp.cmpn(0) === 1);

  });

  it('🚀 Redeeming an emergency', async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();
    const percentage = 10;
    const withdrawal_period = new BN(1);

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    });

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [emergencyKeypair]
    });

    await program.rpc.claimEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      }
    });

    let emergencyAccount = await program.account.emergency.fetch(emergencyKeypair.publicKey);

    await new Promise(r => setTimeout(r, 2000));

    await program.rpc.redeemEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      }
    });

    emergencyAccount = await program.account.emergency.fetchNullable(emergencyKeypair.publicKey);    

  });

});
