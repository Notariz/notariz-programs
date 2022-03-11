import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Notariz } from '../target/types/notariz';
import { expect } from 'chai';

describe('notariz', () => {
  console.log("🚀 Starting test...")
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Notariz as Program<Notariz>;

  const deedKeypair = anchor.web3.Keypair.generate();
  const deedCreator = program.provider.wallet;
  const newDeedOwner = anchor.web3.Keypair.generate();

  it('🚀 Deed creation', async () => {
    // Add your test here.

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    })

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    expect(deedAccount.withdrawalPeriod).to.equal(2);
    expect(deedAccount.leftToBeShared).to.equal(100);
    expect(deedAccount.owner).to.eql(deedCreator.publicKey);
    console.log(deedAccount.lastSeen);

  });

  it('🚀 Editing withdrawal period', async () => {
    const withdrawal_period = 10;

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    expect(deedAccount.withdrawalPeriod).to.equal(10);

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
    const emergencyReceiver = anchor.web3.Keypair.generate();

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
    const emergencyReceiver = anchor.web3.Keypair.generate();

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

});
