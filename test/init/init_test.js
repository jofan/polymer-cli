/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const helpers = require('yeoman-test');
const childProcess = require('child_process');
const inquirer = require('inquirer');
const YeomanEnvironment = require('yeoman-environment');

const polymerInit = require('../../lib/init/init');

var isPlatformWin = /^win/.test(process.platform);

suite('init', () => {
  let sandbox;

  function createFakeEnv() {
    return {
      getGeneratorsMeta: sandbox.stub(),
      run: sandbox.stub().yields(),
    };
  }

  setup(() => {
    sandbox = sinon.sandbox.create();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('runGenerator', () => {

    test('runs the given generator', () => {
      const GENERATOR_NAME = 'TEST-GENERATOR';
      let yeomanEnv = createFakeEnv();
      yeomanEnv.getGeneratorsMeta.returns({
        [GENERATOR_NAME]: GENERATOR_NAME,
      });

      return polymerInit.runGenerator(GENERATOR_NAME, {env: yeomanEnv}).then(() => {
        assert.isOk(yeomanEnv.run.calledWith(GENERATOR_NAME));
      });
    });

    test('fails if an unknown generator is requested', (done) => {
      const UNKNOWN_GENERATOR_NAME = 'UNKNOWN-GENERATOR';
      let yeomanEnv = createFakeEnv();
      yeomanEnv.getGeneratorsMeta.returns({
        'TEST-GENERATOR': 'TEST-GENERATOR',
      });

      polymerInit.runGenerator(UNKNOWN_GENERATOR_NAME, {env: yeomanEnv}).then(() => {
        done(new Error('The promise should have been rejected by now'));
      }).catch((err) => {
        assert.equal(err.message, `Template ${UNKNOWN_GENERATOR_NAME} not found`);
        done();
      });
    });

  });

  suite('promptGeneratorSelection', () => {

    let yeomanEnvMock;

    setup(() => {
      yeomanEnvMock = createFakeEnv();
      yeomanEnvMock.getGeneratorsMeta.returns({
        'polymer-init-element:app': {
          resolved: 'unknown',
          namespace: 'polymer-init-element:app',
        },
      });
    });

    test('prompts with a list of all registered generators', () => {
      let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({generatorName: 'TEST'}));
      return polymerInit.promptGeneratorSelection({env: yeomanEnvMock}).catch((err) => {
        assert.equal(err.message, 'Template TEST not found');
      }).then(() => {
        assert.isTrue(promptStub.calledOnce);
        assert.isTrue(promptStub.calledWithMatch([
          {
            "type":"list",
            "name":"generatorName",
            "message":"Which starter template would you like to use?",
            "choices": [{
              name: 'element: \u001b[2mA blank element template\u001b[22m',
              value: 'polymer-init-element:app',
              short: 'element',
            }],
          },
        ]));
      });
    });

    test('includes user-provided generators in the list when properly installed/registered', () => {
      let yeomanEnv = new YeomanEnvironment();
      let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({generatorName: 'TEST'}));
      helpers.registerDependencies(yeomanEnv, [[helpers.createDummyGenerator(), 'polymer-init-custom-template:app']]);
      return polymerInit.promptGeneratorSelection({env: yeomanEnv}).catch((err) => {
        assert.equal(err.message, 'Template TEST not found');
      }).then(() => {
        assert.isTrue(promptStub.calledOnce);
        let generatorChoices = promptStub.firstCall.args[0][0].choices;
        assert.deepEqual(generatorChoices[generatorChoices.length-1], {
          name: 'custom-template: \u001b[2mno description\u001b[22m',
          value: 'polymer-init-custom-template:app',
          short: 'custom-template',
        });
      });
    });

    if (isPlatformWin) {

      test.only('prompts with a rawlist if being used in MinGW shell', () => {
        let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({generatorName: 'TEST'}));
        sandbox.stub(childProcess, 'execSync').withArgs('uname -s').returns('mingw');

        return polymerInit.promptGeneratorSelection({env: yeomanEnvMock}).catch((err) => {
          assert.equal(err.message, 'Template TEST not found');
        }).then(() => {
          assert.isTrue(promptStub.calledOnce);
          assert.isTrue(promptStub.calledWithMatch([{"type":"rawlist"}]));
        });
      });

    }

  });

});
