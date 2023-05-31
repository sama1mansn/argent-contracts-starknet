import { expect } from "chai";
import { CallData } from "starknet";
import { declareContract, expectEvent, expectRevertWithErrorMessage, randomKeyPair } from "./lib";
import { deployMultisig } from "./lib/multisig";

describe("ArgentMultisig: signer storage", function () {
  let multisigAccountClassHash: string;

  before(async () => {
    multisigAccountClassHash = await declareContract("ArgentMultisig");
  });

  describe("add_signers(new_threshold, signers_to_add)", function () {
    it("Should add one new signer", async function () {
      const threshold = 1;
      const signersLength = 1;

      const newSigner1 = randomKeyPair().publicKey;
      const newSigner2 = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.is_signer(signers[0]).should.eventually.be.true;
      await accountContract.is_signer(newSigner1).should.eventually.be.false;

      await accountContract.add_signers(threshold, [newSigner1]);

      await accountContract.is_signer(newSigner1).should.eventually.be.true;

      const expectedNewSignerCount = 3;

      await expectEvent(() => accountContract.add_signers(threshold, [newSigner2]), {
        from_address: accountContract.address,
        keys: ["ConfigurationUpdated"],
        data: CallData.compile([threshold, expectedNewSignerCount, [newSigner2], []]),
      });
      await accountContract.is_signer(newSigner2).should.eventually.be.true;
    });

    it("Expect revert message under different conditions ('already-a-signer', invalid-zero-signer', 'bad/invalid-threshold')", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      const newSigner1 = randomKeyPair().publicKey;

      // adding a signer that is already an owner
      await expectRevertWithErrorMessage("argent/already-a-signer", () =>
        accountContract.add_signers(threshold, [signers[1]]),
      );
      // adding two of the same signers in the same call
      await expectRevertWithErrorMessage("argent/already-a-signer", () =>
        accountContract.add_signers(threshold, [newSigner1, newSigner1]),
      );
      // adding a zero signer
      await expectRevertWithErrorMessage("argent/invalid-zero-signer", () =>
        accountContract.add_signers(threshold, [0n]),
      );
      // adding a zero threshold
      await expectRevertWithErrorMessage("argent/invalid-threshold", () =>
        accountContract.add_signers(0, [newSigner1]),
      );
      // adding a threshold that is greater than the number of signers
      await expectRevertWithErrorMessage("argent/bad-threshold", () =>
        accountContract.add_signers(signersLength + 2, [newSigner1]),
      );
    });
  });

  describe("remove_signers(new_threshold, signers_to_remove)", function () {
    it("Should remove first signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      const expectedNewSignerCount = 2;

      await expectEvent(() => accountContract.remove_signers(threshold, [signers[0]]), {
        from_address: accountContract.address,
        keys: ["ConfigurationUpdated"],
        data: CallData.compile([threshold, expectedNewSignerCount, [], [signers[0]]]),
      });

      await accountContract.is_signer(signers[0]).should.eventually.be.false;
    });

    it("Should remove middle signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[1]]);

      accountContract.is_signer(signers[1]).should.eventually.be.false;
    });

    it("Should remove last signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[2]]);
      await accountContract.is_signer(signers[2]).should.eventually.be.false;
    });

    it("Should remove first and middle signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[0], signers[1]]);

      await accountContract.is_signer(signers[0]).should.eventually.be.false;
      await accountContract.is_signer(signers[1]).should.eventually.be.false;
      await accountContract.is_signer(signers[2]).should.eventually.be.true;
    });

    it("Should remove first and last signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[0], signers[2]]);

      await accountContract.is_signer(signers[0]).should.eventually.be.false;
      await accountContract.is_signer(signers[2]).should.eventually.be.false;
      await accountContract.is_signer(signers[1]).should.eventually.be.true;
    });

    it("Should remove middle and last signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[1], signers[2]]);

      await accountContract.is_signer(signers[1]).should.eventually.be.false;
      await accountContract.is_signer(signers[2]).should.eventually.be.false;
      await accountContract.is_signer(signers[0]).should.eventually.be.true;
    });

    it("Should remove middle and first signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[1], signers[0]]);

      await accountContract.is_signer(signers[1]).should.eventually.be.false;
      await accountContract.is_signer(signers[0]).should.eventually.be.false;
      await accountContract.is_signer(signers[2]).should.eventually.be.true;
    });

    it("Should remove last and first signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[2], signers[0]]);

      await accountContract.is_signer(signers[2]).should.eventually.be.false;
      await accountContract.is_signer(signers[0]).should.eventually.be.false;
      await accountContract.is_signer(signers[1]).should.eventually.be.true;
    });

    it("Should remove last and middle signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.remove_signers(threshold, [signers[2], signers[1]]);

      await accountContract.is_signer(signers[2]).should.eventually.be.false;
      await accountContract.is_signer(signers[1]).should.eventually.be.false;
      await accountContract.is_signer(signers[0]).should.eventually.be.true;
    });

    it("Expect revert message under different conditions ('not-a-signer', invalid-zero-signer', 'bad/invalid-threshold')", async function () {
      const threshold = 1;
      const signersLength = 3;

      const nonSigner = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      // removing a non-signer
      await expectRevertWithErrorMessage("argent/not-a-signer", () =>
        accountContract.remove_signers(threshold, [nonSigner]),
      );
      // removing a 0 signer
      await expectRevertWithErrorMessage("argent/not-a-signer", () => accountContract.remove_signers(threshold, [0n]));
      // removing same signer twice in one call
      await expectRevertWithErrorMessage("argent/not-a-signer", () =>
        accountContract.remove_signers(threshold, [signers[0], signers[0]]),
      );
      // removing a signer and updating threshold > owners
      await expectRevertWithErrorMessage("argent/bad-threshold", () => accountContract.remove_signers(3, [signers[1]]));
      // removing a signer and updating threshold to 0
      await expectRevertWithErrorMessage("argent/invalid-threshold", () =>
        accountContract.remove_signers(0, [signers[1]]),
      );
    });
  });
  describe("replace_signers(signer_to_remove, signer_to_add)", function () {
    it("Should replace one signer", async function () {
      const threshold = 1;
      const signersLength = 1;

      const newSigner = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      const expectedNewSignerCount = 1;

      await expectEvent(() => accountContract.replace_signer(signers[0], newSigner), {
        from_address: accountContract.address,
        keys: ["ConfigurationUpdated"],
        data: CallData.compile([threshold, expectedNewSignerCount, [newSigner], [signers[0]]]),
      });

      await accountContract.is_signer(newSigner).should.eventually.be.true;
    });

    it("Should replace first signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const newSigner = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.replace_signer(signers[0], newSigner);

      const signersList = await accountContract.get_signers();
      expect(signersList).to.have.ordered.members([newSigner, signers[1], signers[2]]);
    });

    it("Should replace middle signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const newSigner = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.replace_signer(signers[1], newSigner);

      const signersList = await accountContract.get_signers();
      expect(signersList).to.have.ordered.members([signers[0], newSigner, signers[2]]);
    });

    it("Should replace last signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const newSigner = randomKeyPair().publicKey;

      const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      await accountContract.replace_signer(signers[2], newSigner);

      const signersList = await accountContract.get_signers();
      expect(signersList).to.have.ordered.members([signers[0], signers[1], newSigner]);
    });
  });

  it("Expect revert message under different conditions ('not-a-signer', already-a-signer', 'invalid-zero-signer')", async function () {
    const threshold = 1;
    const signersLength = 3;

    const nonSigner = randomKeyPair().publicKey;
    const newSigner = randomKeyPair().publicKey;

    const { accountContract, signers } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

    // trying to replace a non-signer
    await expectRevertWithErrorMessage("argent/not-a-signer", () =>
      accountContract.replace_signer(nonSigner, newSigner),
    );
    // replacing a signer with an existing one
    await expectRevertWithErrorMessage("argent/already-a-signer", () =>
      accountContract.replace_signer(signers[0], signers[1]),
    );
    // replacing a signer with itself
    await expectRevertWithErrorMessage("argent/already-a-signer", () =>
      accountContract.replace_signer(signers[0], signers[0]),
    );
    // replacing a signer with 0
    await expectRevertWithErrorMessage("argent/invalid-zero-signer", () =>
      accountContract.replace_signer(signers[0], 0n),
    );
  });
  describe("replace_signers(signer_to_remove, signer_to_add)", function () {
    it("Should replace one signer", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      const initialThreshold = await accountContract.get_threshold();
      expect(initialThreshold).to.equal(BigInt(threshold));

      const newThreshold = 2;
      await expectEvent(() => accountContract.change_threshold(newThreshold), {
        from_address: accountContract.address,
        keys: ["ConfigurationUpdated"],
        data: CallData.compile([newThreshold, 3, [], []]),
      });
      const updatedThreshold = await accountContract.get_threshold();
      expect(updatedThreshold).to.be.equal(BigInt(newThreshold));
    });

    it("Expect 'argent/invalid-threshold' or 'argent/bad-threshold' if threshold is not correctly set (0 or > no. owners)", async function () {
      const threshold = 1;
      const signersLength = 3;

      const { accountContract } = await deployMultisig(multisigAccountClassHash, threshold, signersLength);

      // adding a threshold that is greater than the number of signers
      await expectRevertWithErrorMessage("argent/bad-threshold", () =>
        accountContract.change_threshold(signersLength + 1),
      );
      // adding a 0 threshold
      await expectRevertWithErrorMessage("argent/invalid-threshold", () => accountContract.change_threshold(0));
    });
  });
});
