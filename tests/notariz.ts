import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { Transaction, SystemProgram } from "@solana/web3.js";

import { Notariz } from "../target/types/notariz";
import { expect } from "chai";

const assert = require("assert");

describe("notariz", () => {
  console.log("🚀 Starting test...");
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Notariz as Program<Notariz>;

  const deedKeypair = anchor.web3.Keypair.generate();
  console.log("Deed account address: ", deedKeypair.publicKey.toBase58());

  const newDeedKeypair = anchor.web3.Keypair.generate();
  console.log(
    "New deed account address: ",
    newDeedKeypair.publicKey.toBase58()
  );

  const emergencyKeypair = anchor.web3.Keypair.generate();
  console.log(
    "Emergency account address: ",
    emergencyKeypair.publicKey.toBase58()
  );

  const newEmergencyKeypair = anchor.web3.Keypair.generate();
  console.log(
    "New emergency account address: ",
    newEmergencyKeypair.publicKey.toBase58()
  );

  const deedCreator = anchor.web3.Keypair.generate();
  console.log(
    "Deed creator account address: ",
    deedCreator.publicKey.toBase58()
  );

  const newDeedOwner = anchor.web3.Keypair.generate();
  console.log(
    "New deed owner account address: ",
    newEmergencyKeypair.publicKey.toBase58()
  );

  const emergencyReceiver = anchor.web3.Keypair.generate();
  console.log(
    "Emergency receiver account address: ",
    emergencyReceiver.publicKey.toBase58()
  );

  const recoveryKeypair = anchor.web3.Keypair.generate();
  console.log(
    "Recovery account address: ",
    recoveryKeypair.publicKey.toBase58()
  );

  const newRecoveryKeypair = anchor.web3.Keypair.generate();
  console.log(
    "New Recovery account address: ",
    newRecoveryKeypair.publicKey.toBase58()
  );

  const recoveryReceiver = anchor.web3.Keypair.generate();
  console.log(
    "Recovery receiver account address: ",
    recoveryReceiver.publicKey.toBase58()
  );

  before((done) => {
    program.provider.connection
      .requestAirdrop(deedCreator.publicKey, 1000000000)
      .then((res) => program.provider.connection.confirmTransaction(res))
      .then(() =>
        program.provider.connection.getAccountInfo(deedCreator.publicKey)
      )
      .then(console.log)
      .catch(console.log)
      .finally(done);
  });

  it("🚀 Deed creation", async () => {
    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    let deedAccount = await program.account.deed.fetch(deedKeypair.publicKey);

    assert.ok(deedAccount.withdrawalPeriod.cmpn(172800) === 0);
    expect(deedAccount.leftToBeShared).to.equal(100);
    expect(deedAccount.owner).to.eql(deedCreator.publicKey);
  });

  it("🚀 Deed top-up", async () => {
    const lamportsToSend = 110000000;

    let deedAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    await program.provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: deedCreator.publicKey,
            toPubkey: deedKeypair.publicKey,
            lamports: lamportsToSend,
          })
        );
        return tx;
      })(),
      [deedCreator]
    );

    let deedAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    assert.ok(
      deedAccountInfoAfterTransfer.lamports ===
        deedAccountInfoBeforeTransfer.lamports + lamportsToSend
    );
  });

  it("🚀 Withdrawing lamports from deed account", async () => {
    const lamportsToSend = new BN(10000000);

    let deedAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    await program.rpc
      .withdrawDeedLamports(lamportsToSend, {
        accounts: {
          deed: deedKeypair.publicKey,
          owner: deedCreator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [deedCreator],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

    let deedAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(deedKeypair.publicKey);

    assert.ok(
      deedAccountInfoAfterTransfer.lamports <
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
      signers: [deedCreator],
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
      signers: [deedCreator],
    });

    await program.provider.connection
      .getAccountInfo(deedKeypair.publicKey)
      .catch(console.log);

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

    let deedCreatorAccountBeforeDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

      await program.rpc.deleteDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator],
    });

    const deedAccount = await program.account.deed.fetchNullable(
      deedKeypair.publicKey
    );

    let deedCreatorAccountAfterDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

    assert.ok(
      deedCreatorAccountAfterDeletion.lamports >
        deedCreatorAccountBeforeDeletion.lamports
    );

    expect(deedAccount === null);
  });

  it("🚀 Adding an emergency", async () => {
    const percentage = 10;

    await program.rpc.createDeed({
      accounts: {
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [newDeedKeypair, deedCreator],
    });

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
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

  it("🚀 Editing emergency percentage", async () => {
    let percentage = 20;

    let emergencyAccount = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    let percentageDifference = emergencyAccount.percentage - percentage;

    let upstreamDeedAccount = await program.account.deed.fetch(
      emergencyAccount.upstreamDeed
    );

    await program.rpc.editPercentage(percentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: emergencyAccount.upstreamDeed,
        owner: deedCreator.publicKey
      },
      signers: [deedCreator],
    });

    let emergencyAccountAfterEdit = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    let upstreamDeedAccountAfterEdit = await program.account.deed.fetch(
      emergencyAccount.upstreamDeed
    );

    expect(emergencyAccountAfterEdit.percentage).to.equal(percentage);
    expect(upstreamDeedAccountAfterEdit.leftToBeShared).to.equal(upstreamDeedAccount.leftToBeShared + percentageDifference);
    
    let newPercentage = 10;

    emergencyAccount = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    upstreamDeedAccount = await program.account.deed.fetch(
      emergencyAccount.upstreamDeed
    );

    await program.rpc.editPercentage(newPercentage, {
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: emergencyAccount.upstreamDeed,
        owner: deedCreator.publicKey
      },
      signers: [deedCreator],
    });

    let newEmergencyAccountAfterEdit = await program.account.emergency.fetch(
      emergencyKeypair.publicKey
    );

    let newPercentageDifference = emergencyAccount.percentage - newPercentage;

    let newUpstreamDeedAccountAfterEdit = await program.account.deed.fetch(
      emergencyAccount.upstreamDeed
    );

    expect(newEmergencyAccountAfterEdit.percentage).to.equal(newPercentage);
    expect(newUpstreamDeedAccountAfterEdit.leftToBeShared).to.equal(upstreamDeedAccount.leftToBeShared + newPercentageDifference);
  });

  it("🚀 Deleting an emergency", async () => {
    let deedAccountInfoBeforeEmergencyDeletion =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );
    let deedCreatorAccountInfoBeforeEmergencyDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

    await program.rpc.deleteEmergency({
      accounts: {
        emergency: emergencyKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedCreator],
    });

    let deedAccountInfoAfterEmergencyDeletion =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );
    let deedCreatorAccountInfoAfterEmergencyDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

    const emergencyAccount = await program.account.emergency.fetchNullable(
      emergencyKeypair.publicKey
    );

    expect(
      deedCreatorAccountInfoAfterEmergencyDeletion.lamports >
        deedCreatorAccountInfoBeforeEmergencyDeletion.lamports
    );
    expect(
      deedAccountInfoAfterEmergencyDeletion.lamports >
        deedAccountInfoBeforeEmergencyDeletion.lamports
    );
    expect(emergencyAccount === null);
  });

  it("🚀 Editing emergency payments", async () => {
    let percentage = 100;
    let numberOfPayments = 3;
    let timeBetweenPayments = new BN(1);

    await program.rpc.addEmergency(emergencyReceiver.publicKey, percentage, {
      accounts: {
        emergency: newEmergencyKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [newEmergencyKeypair, deedCreator],
    });

    let emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

    await program.rpc.editPayments(timeBetweenPayments, numberOfPayments, {
      accounts: {
        emergency: newEmergencyKeypair.publicKey,
        deed: emergencyAccount.upstreamDeed,
        owner: deedCreator.publicKey
      },
      signers: [deedCreator],
    });

    let emergencyAccountAfterEdit = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

    expect(emergencyAccountAfterEdit.numberOfPayments).to.equal(numberOfPayments);
    assert.ok(emergencyAccountAfterEdit.timeBetweenPayments.cmpn(1) == 0);
  });

  it("🚀 Claiming an emergency transfer", async () => {
    const percentage = 10;

    await program.rpc.claimEmergency({
      accounts: {
        emergency: newEmergencyKeypair.publicKey,
        receiver: emergencyReceiver.publicKey
      },
      signers: [emergencyReceiver],
    });

    let emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );
    assert.ok(emergencyAccount.claimedTimestamp.cmpn(0) > 0);
  });

  it("🚀 Rejecting a claim request", async () => {
    await program.rpc.rejectClaim({
      accounts: {
        emergency: newEmergencyKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator],
    });

    let emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );
    assert.ok(emergencyAccount.claimedTimestamp.cmpn(0) === 0);
  });

  it("🚀 Redeeming an emergency transfer", async () => {
    const withdrawal_period = new BN(0);
    const lamportsToSend = 100000000;
    let totalNumberOfPayments = 3;
    let timeBetweenPayments = new BN(1);

    await program.provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: deedCreator.publicKey,
            toPubkey: newDeedKeypair.publicKey,
            lamports: lamportsToSend,
          })
        );
        return tx;
      })(),
      [deedCreator]
    );

    await program.provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: deedCreator.publicKey,
            toPubkey: emergencyReceiver.publicKey,
            lamports: lamportsToSend,
          })
        );
        return tx;
      })(),
      [deedCreator]
    );

    let emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

    await program.rpc.editPayments(timeBetweenPayments, totalNumberOfPayments, {
      accounts: {
        emergency: newEmergencyKeypair.publicKey,
        deed: emergencyAccount.upstreamDeed,
        owner: deedCreator.publicKey
      },
      signers: [deedCreator],
    });

    emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

  const numberOfPayments = emergencyAccount.numberOfPayments;
  const paymentsLeft = emergencyAccount.paymentsLeft;

  assert.ok(emergencyAccount.timeBetweenPayments.cmpn(0) > 0);
  expect(numberOfPayments == totalNumberOfPayments);
  expect(paymentsLeft == 3);

    await program.rpc.editWithdrawalPeriod(withdrawal_period, {
      accounts: {
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
      },
      signers: [deedCreator],
    });

    let receiverAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
      );
    let senderAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );

    await program.rpc
      .claimEmergency({
        accounts: {
          emergency: newEmergencyKeypair.publicKey,
          receiver: emergencyReceiver.publicKey,
        },
        signers: [emergencyReceiver],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

      emergencyAccount = await program.account.emergency.fetch(
        newEmergencyKeypair.publicKey
      );

      assert.ok(emergencyAccount.claimedTimestamp.cmpn(0) > 0);

    await new Promise((r) => setTimeout(r, 1000));

    await program.rpc
      .redeemEmergency({
        accounts: {
          emergency: newEmergencyKeypair.publicKey,
          receiver: emergencyReceiver.publicKey,
          deed: emergencyAccount.upstreamDeed,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [emergencyReceiver],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

    expect(emergencyAccount.paymentsLeft == paymentsLeft - 1);
    
    let emergencyAccountAfterFirstTransfer =
      await program.provider.connection.getAccountInfo(
        newEmergencyKeypair.publicKey
    );

    expect(emergencyAccountAfterFirstTransfer.lamports > 0);

    let receiverAccountInfoAfterFirstTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
    );

    let senderAccountInfoAfterFirstTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
    );

    emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

    await new Promise((r) => setTimeout(r, 1000));

    await program.rpc
      .redeemEmergency({
        accounts: {
          emergency: newEmergencyKeypair.publicKey,
          receiver: emergencyReceiver.publicKey,
          deed: emergencyAccount.upstreamDeed,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [emergencyReceiver],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

    let receiverAccountInfoAfterSecondTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
    );

    let senderAccountInfoAfterSecondTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
    );

    emergencyAccount = await program.account.emergency.fetch(
      newEmergencyKeypair.publicKey
    );

    await new Promise((r) => setTimeout(r, 1000));

    await program.rpc
      .redeemEmergency({
        accounts: {
          emergency: newEmergencyKeypair.publicKey,
          receiver: emergencyReceiver.publicKey,
          deed: emergencyAccount.upstreamDeed,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [emergencyReceiver],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

      emergencyAccount = await program.account.emergency.fetchNullable(
        newEmergencyKeypair.publicKey
      );

      expect(emergencyAccount === null);

      let receiverAccountInfoAfterThirdTransfer =
      await program.provider.connection.getAccountInfo(
        emergencyReceiver.publicKey
    );

    let senderAccountInfoAfterThirdTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
    );


    assert.ok(
      receiverAccountInfoAfterFirstTransfer.lamports >
        receiverAccountInfoBeforeTransfer.lamports
    );
    assert.ok(
      senderAccountInfoAfterFirstTransfer.lamports <
        senderAccountInfoBeforeTransfer.lamports
    );

    assert.ok(
      receiverAccountInfoAfterSecondTransfer.lamports >
        receiverAccountInfoAfterFirstTransfer.lamports
    );
    assert.ok(
      senderAccountInfoAfterSecondTransfer.lamports <
        senderAccountInfoAfterFirstTransfer.lamports
    );

    assert.ok(
      receiverAccountInfoAfterThirdTransfer.lamports >
        receiverAccountInfoAfterSecondTransfer.lamports
    );
    assert.ok(
      senderAccountInfoAfterThirdTransfer.lamports <
        senderAccountInfoAfterSecondTransfer.lamports
    );
  });

  it("🚀 Adding a recovery", async () => {
    await program.rpc.addRecovery(recoveryReceiver.publicKey, {
      accounts: {
        recovery: recoveryKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [recoveryKeypair, deedCreator],
    });

    let recoveryAccount = await program.account.recovery.fetch(
      recoveryKeypair.publicKey
    );

    expect(recoveryAccount.owner).to.eql(deedCreator.publicKey);
    expect(recoveryAccount.receiver).to.eql(recoveryReceiver.publicKey);

  });

  it("🚀 Deleting a recovery", async () => {
    let deedAccountInfoBeforeRecoveryDeletion =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );
    let deedCreatorAccountInfoBeforeRecoveryDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

    await program.rpc.deleteRecovery({
      accounts: {
        recovery: recoveryKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedCreator],
    });

    let deedAccountInfoAfterRecoveryDeletion =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );
    let deedCreatorAccountInfoAfterRecoveryDeletion =
      await program.provider.connection.getAccountInfo(deedCreator.publicKey);

    const recoveryAccount = await program.account.emergency.fetchNullable(
      recoveryKeypair.publicKey
    );

    expect(
      deedCreatorAccountInfoAfterRecoveryDeletion.lamports >
        deedCreatorAccountInfoBeforeRecoveryDeletion.lamports
    );
    expect(
      deedAccountInfoAfterRecoveryDeletion.lamports >
        deedAccountInfoBeforeRecoveryDeletion.lamports
    );
    expect(recoveryAccount === null);
  });

  it("🚀 Redeeming a recovery", async () => {
    const lamportsToSend = 50000000;

    await program.provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: deedCreator.publicKey,
            toPubkey: newDeedKeypair.publicKey,
            lamports: lamportsToSend,
          })
        );
        return tx;
      })(),
      [deedCreator]
    );

    await program.provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: deedCreator.publicKey,
            toPubkey: recoveryReceiver.publicKey,
            lamports: lamportsToSend,
          })
        );
        return tx;
      })(),
      [deedCreator]
    );

    let receiverAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(
        recoveryReceiver.publicKey
      );
    let senderAccountInfoBeforeTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );

    await program.rpc.addRecovery(recoveryReceiver.publicKey, {
      accounts: {
        recovery: newRecoveryKeypair.publicKey,
        deed: newDeedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [newRecoveryKeypair, deedCreator],
    });

    let recoveryAccount = await program.account.recovery.fetch(
      newRecoveryKeypair.publicKey
    );

    await program.rpc
      .redeemRecovery({
        accounts: {
          recovery: newRecoveryKeypair.publicKey,
          receiver: recoveryReceiver.publicKey,
          deed: recoveryAccount.upstreamDeed,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [recoveryReceiver],
      })
      .then((res) => program.provider.connection.confirmTransaction(res))
      .catch(console.log);

    recoveryAccount = await program.account.emergency.fetchNullable(
      newEmergencyKeypair.publicKey
    );

    expect(recoveryAccount === null);

    let receiverAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(
        recoveryReceiver.publicKey
      );

    let senderAccountInfoAfterTransfer =
      await program.provider.connection.getAccountInfo(
        newDeedKeypair.publicKey
      );

    assert.ok(
      receiverAccountInfoAfterTransfer.lamports >
        receiverAccountInfoBeforeTransfer.lamports
    );
    assert.ok(senderAccountInfoAfterTransfer === null);
  });

  it("🚀 Fetching all deeds", async () => {
    const deedAccounts = await program.account.deed.all();
    assert.ok(deedAccounts.length > 0);
  });

  it("🚀 Fetching deeds by owner", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    const deedAccounts = await program.account.deed.all([
      {
        memcmp: {
          offset: 8, // Discriminator.
          bytes: deedCreator.publicKey.toBase58(),
        },
      },
    ]);

    assert.ok(deedAccounts.length > 0);
    assert.ok(
      deedAccounts.every((deedAccount) => {
        return (
          deedAccount.account.owner.toBase58() ===
          deedCreator.publicKey.toBase58()
        );
      })
    );
  });

  it("🚀 Fetching emergencies by receiver", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const emergencyKeypair = anchor.web3.Keypair.generate();
    const percentage = 20;

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

    const emergencyAccounts = await program.account.emergency.all([
      {
        memcmp: {
          offset:
            8 + // Discriminator.
            32 + // Upstream deed public key.
            32, // Emergency owner public key.
          bytes: emergencyReceiver.publicKey.toBase58(),
        },
      },
    ]);

    assert.ok(emergencyAccounts.length > 0);
    assert.ok(
      emergencyAccounts.every((emergencyAccount) => {
        return (
          emergencyAccount.account.receiver.toBase58() ===
          emergencyReceiver.publicKey.toBase58()
        );
      })
    );
  });

  it("🚀 Fetching recoveries by owner", async () => {

    const deedKeypair = anchor.web3.Keypair.generate();
    const recoveryKeypair = anchor.web3.Keypair.generate();

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });

    await program.rpc.addRecovery(recoveryReceiver.publicKey, {
      accounts: {
        recovery: recoveryKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [recoveryKeypair, deedCreator],
    });

    const recoveryAccounts = await program.account.recovery.all([
      {
        memcmp: {
          offset: 8 + 32, // Discriminator.
          bytes: deedCreator.publicKey.toBase58(),
        },
      },
    ]);

    assert.ok(recoveryAccounts.length > 0);
    assert.ok(
      recoveryAccounts.every((recoveryAccount) => {
        return (
          recoveryAccount.account.owner.toBase58() ===
          deedCreator.publicKey.toBase58()
        );
      })
    );
  });

  it("🚀 Fetching recoveries by receiver", async () => {

    const deedKeypair = anchor.web3.Keypair.generate();
    const recoveryKeypair = anchor.web3.Keypair.generate();

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [deedKeypair, deedCreator],
    });
    
    await program.rpc.addRecovery(recoveryReceiver.publicKey, {
      accounts: {
        recovery: recoveryKeypair.publicKey,
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [recoveryKeypair, deedCreator],
    });

    const recoveryAccounts = await program.account.recovery.all([
      {
        memcmp: {
          offset: 8 + 32 + 32, // Discriminator.
          bytes: recoveryReceiver.publicKey.toBase58(),
        },
      },
    ]);

    assert.ok(recoveryAccounts.length > 0);
    assert.ok(
      recoveryAccounts.every((recoveryAccount) => {
        return (
          recoveryAccount.account.receiver.toBase58() ===
          recoveryReceiver.publicKey.toBase58()
        );
      })
    );
  });
});
