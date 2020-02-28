/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'reflect-metadata';

import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { assert } from 'chai';
import 'mocha';
import { Logger } from 'mozlog';
import rewiremock from 'rewiremock';
import sinon from 'sinon';
import { StubbedInstance, stubInterface, stubObject } from 'ts-sinon';

import { Account } from '../../lib/db/models';
import { randomAccount } from './db/models/helpers';

const USER_1 = randomAccount();

describe('sentry', () => {
  let accountStub: StubbedInstance<typeof Account>;
  let query: ApolloServerTestClient['query'];
  let logger: Logger;
  let mockCaptureException: any;

  beforeEach(async () => {
    accountStub = stubObject(Account, {
      query: {
        findOne: () => {
          throw new Error('boom');
        }
      }
    });
    const mockScope = { setContext: sinon.stub() };
    const mockCapture = (func: any) => {
      func(mockScope);
    };
    mockCaptureException = sinon.stub();
    rewiremock('@sentry/node').with({
      captureException: mockCaptureException,
      withScope: mockCapture
    });
    const { AccountResolver } = rewiremock.proxy('../../lib/resolvers/account-resolver.ts', {
      '../db/models': { Account: accountStub }
    });
    const { createServer } = rewiremock.proxy('../../lib/server.ts', {
      './db': { setupDatabase: sinon.fake.returns({}) },
      './resolvers/account-resolver': { AccountResolver }
    });
    logger = stubInterface<Logger>();
    const server = await createServer({ env: 'production', database: {} }, logger, () => {
      return { authUser: 'test1234', logger, logAction: logger.info };
    });
    query = createTestClient(server).query;
  });

  it('captures an error from the resolver with no db setup', async () => {
    const graphQuery = `query {
      accountByUid(uid: "${USER_1.uid}") {
        uid
        email
      }
    }`;
    const result = await query({ query: graphQuery });
    assert.isDefined(result.errors);
    assert.equal((result as any).errors[0].message, 'Internal server error');
    assert.equal(mockCaptureException.callCount, 1);
    const err = mockCaptureException.args[0][0];
    assert.equal(err.message, 'boom');
  });
});
