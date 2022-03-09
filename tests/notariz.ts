import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Notariz } from '../target/types/notariz';
import { expect } from 'chai';

describe('notariz', () => {
  console.log("🚀 Starting test...")
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  it('🚀 Deed creation', async () => {
    // Add your test here.
    const program = anchor.workspace.Notariz as Program<Notariz>;
    const deedKeypair = anchor.web3.Keypair.generate();
    const deedCreator = program.provider.wallet;

    await program.rpc.createDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: deedCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
    })

    let deedState = await program.account.myDeed.fetch(deedKeypair.publicKey);

    expect(deedState.withdrawalPeriod).to.equal(2);
    expect(deedState.leftToBeShared).to.equal(100);
    expect(deedState.owner).to.eql(deedCreator.publicKey);
    expect(deedState.emergencies).to.eql([]);
    expect(deedState.recoveries).to.eql([]);
    console.log(deedState.lastSeen);

  });
});
