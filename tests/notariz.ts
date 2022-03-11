import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import {
  clusterApiUrl,
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  ConfirmOptions,
} from '@solana/web3.js';

import { Notariz } from "../target/types/notariz";
import { expect } from "chai";

const assert = require("assert");

describe("notariz", () => {
  console.log("🚀 Starting test...");
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Notariz as Program<Notariz>;

  const deedKeypair = anchor.web3.Keypair.generate();
  const deedCreator = anchor.web3.Keypair.generate();
  const newDeedOwner = program.provider.wallet;
  const emergencyReceiver = program.provider.wallet;

  before(async () => (await program.provider.connection.requestAirdrop(
      deedCreator.publicKey,
      10000000, )
  ));

  it("🚀 Deed creation", async () => {
    // Add your test here.
    
    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    assert.ok(deedAccount.withdrawalPeriod.toString() == "172800");
    expect(deedAccount.leftToBeShared).to.equal(100);
    expect(deedAccount.owner).to.eql(deedCreator.publicKey);
  });

  it("🚀 Deed top-up", async () => {
    const lamportsToSend = 10000;

    let deedAccountInfoBeforeTransfer = await program.provider.connection.getAccountInfo(deedKeypair.publicKey);
    console.log("Before: ", deedAccountInfoBeforeTransfer.lamports);

    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deedCreator.publicKey,
        toPubkey: deedKeypair.publicKey,
        lamports: lamportsToSend,
      })
    );

    await program.provider.connection.sendTransaction(transferTransaction, [deedCreator]);

    let deedAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);
    console.log("After: ", deedAccountInfoAfterTransfer.lamports);
    assert.ok(
      deedAccountInfoAfterTransfer.lamports >
        deedAccountInfoBeforeTransfer.lamports
    );
  });

  it("🚀 Editing withdrawal period", async () => {
    const withdrawal_period = new BN(10 * 24 * 3600, 10);

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator]
    });

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);
    assert.ok(deedAccount.withdrawalPeriod.cmpn(864000) === 0);
  });

  it("🚀 Editing deed owner", async () => {
    await program.rpc.editOwner(newDeedOwner.publicKey, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator]
    });

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    expect(deedAccount.owner).to.eql(newDeedOwner.publicKey);
  });

  it("🚀 Deed deletion", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.deleteDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator]
    });

    const deedAccount = await program.account.deed.fetchNullable(
      deedKeypair.publicKey
    );

    expect(deedAccount === null);
  });

  it("🚀 Adding an emergency", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();

    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [emergencyKeypair, deedCreator],
    });

    let emergencyAccount = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    expect(emergencyAccount.owner).to.eql(deedCreator.publicKey);
    expect(emergencyAccount.receiver).to.eql(emergencyReceiver.publicKey);
    expect(emergencyAccount.percentage).to.equal(percentage);
  });

  it("🚀 Deleting an emergency", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();

    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [emergencyKeypair, deedCreator],
    });

    await program.rpc.deleteEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedCreator]
    });

    const emergencyAccount = await program.account.emergency.fetchNullable(
      emergencyKeypair.publicKey
    );

    expect(emergencyAccount === null);
  });

  it("🚀 Claiming an emergency", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();
    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [emergencyKeypair, deedCreator],
    });

    await program.rpc.claimEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });

    let emergencyAccount = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );
    assert.ok(emergencyAccount.claimedTimestamp.cmpn(0) === 1);
  });

  it("🚀 Redeeming an emergency", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();
    const percentage = 10;
    const withdrawal_period = new BN(1);

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator]
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [emergencyKeypair, deedCreator],
    });

    await program.rpc.claimEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });

    let emergencyAccount = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    let receiverAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
      );
    let senderAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    await new Promise((r) => setTimeout(r, 2000));

    await program.rpc.redeemEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey,
        deed: deedKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });

    emergencyAccount = await program.account.emergency.fetchNullable(
      emergencyKeypair.publicKey
    );

    let receiverAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
      );
    let senderAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    assert.ok(
      receiverAccountInfoAfterTransfer.lamports >
        receiverAccountInfoBeforeTransfer.lamports
    );
    assert.ok(
      senderAccountInfoAfterTransfer.lamports <
        senderAccountInfoBeforeTransfer.lamports
    );
  });

  it("🚀 Fetching all deeds", async () => {
    const deedAccounts = await program.account.deed.all();
    assert.ok(deedAccounts.length > 0);
  });

  it("🚀 Fetching deeds by owner", async () => {
    const deedAccounts = await program.account.deed.all([
      {
        memcmp: {
            offset: 8, // Discriminator.
            bytes: deedCreator.publicKey.toBase58(),
        }
    }
    ]);

    assert.ok(deedAccounts.length > 0);
    assert.ok(deedAccounts.every(deedAccount => {
      return deedAccount.account.owner.toBase58() === deedCreator.publicKey.toBase58()
  }))

});

  it("🚀 Fetching emergencies by receiver", async () => {
    const emergencyAccounts = await program.account.emergency.all([
      {
        memcmp: {
            offset: 8 // Discriminator. 
            + 32 // Upstream deed public key.
            + 32, // Emergency owner public key.
            bytes: emergencyReceiver.publicKey.toBase58(),
        }
    }
    ]);

    assert.ok(emergencyAccounts.length > 0);
    assert.ok(emergencyAccounts.every(emergencyAccount => {
      return emergencyAccount.account.receiver.toBase58() === emergencyReceiver.publicKey.toBase58()
  }))

  });
 
});
