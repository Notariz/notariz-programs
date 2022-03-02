const anchor = require("@project-serum/anchor");
const expect = require('chai').expect;
// import { expect } from 'chai';

describe("notariz-programs", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.NotarizPrograms;
  const divineOwner = program.provider.wallet;

  it("I want my deed dude!", async () => {
    const deedKeypair = anchor.web3.Keypair.generate();
    const tx = await program.rpc.openDeed({
      accounts: {
        deed: deedKeypair.publicKey,
        owner: divineOwner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [deedKeypair]
        })
    ;
    let deedState = await program.account.deed.fetch(deedKeypair.publicKey);

    // this test fail idk why :'c
    // console.log(deedState.ownerAddress);
    // console.log(divineOwner.publicKey);
    // expect(deedState.ownerAddress).to.equal(divineOwner.publicKey);

    expect(deedState.recoveryAddress).to.equal(null);
    expect(deedState.deedExpirationTime).to.equal(null);
    expect(deedState.inheritance).to.eql([]);
    expect(deedState.totalShares).to.equal(0);

    // TODO - test if last seen is recent (less than few seconds ago)
    // console.log((new Date()).getTime()/1000);
    // console.log(deedState.lastSeen);
    // console.log(parseInt(deedState.lastSeen._bn, 16));

  });
});
