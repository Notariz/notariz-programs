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
    expect(deedAccount.emergencies).to.eql([]);
    expect(deedAccount.recoveries).to.eql([]);
    console.log(deedAccount.lastSeen);

  });

  it('🚀 Deed deletion', async () => {

    await program.rpc.deleteDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey
      }
    })

    const deedAccount = await program.account.deed.fetchNullable(deedKeypair.publicKey);

    expect(deedAccount === null);

  });

});
