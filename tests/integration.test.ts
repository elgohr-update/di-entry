import { messages } from '../src/messages';
import { connect, Payload } from 'ts-nats';

const TIMEOUT = 1000;

it('create.entry flow', async () => {
  interface Scope {
    [key: string]: any;
  }

  const text = "Testing 123"
  const creatorId = '123';

  const nc = await connect({
    servers: ['nats://localhost:4222'],
    payload: Payload.BINARY
  });

  const request = messages.entry.CreateEntryRequest.encode({
    payload: {
      text,
    },
    context: {
      userId: creatorId,
    }
  }).finish();
  const message = await nc.request('create.entry', TIMEOUT, request);
  const response = message.data;
  const { payload: entry } = messages.entry.CreateEntryResponse.decode(response);
  expect(entry).toEqual({
    id: expect.any(String)
  });

  if (!entry) throw new Error();

  const getRequest = messages.entry.GetEntryRequest.encode({
    payload: {
      id: entry.id,
    },
    context: {
      userId: creatorId
    }
  }).finish();
  const getMessage = await nc.request('get.entry', TIMEOUT, getRequest);
  const getResponse = getMessage.data;
  const { payload: newEentry, error } = messages.entry.GetEntryResponse.decode(getResponse);
  expect(error).toEqual(null);
  expect(newEentry).toEqual({
    id: expect.any(String),
    text,
    creatorId
  });

  nc.close();
});

describe('errors', () => {
  it('create.entry', async () => {
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      payload: Payload.BINARY
    });
    const request = messages.entry.CreateEntryRequest.encode({
      payload: {}, // Triggers a validation error
      context: {
        userId: '123',
      }
    }).finish();
    const message = await nc.request('create.entry', TIMEOUT, request);
    const response = message.data;
    const { error } = messages.entry.CreateEntryResponse.decode(response);
    expect(error).toEqual({
      code: messages.entry.Error.Code.VALIDATION_FAILED,
      message: 'oops'
    });

    nc.close();
  });

  it('get.entry', async () => {
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      payload: Payload.BINARY
    });
    const request = messages.entry.GetEntryRequest.encode({
      payload: {
        id: '99999'
      },
      context: {
        userId: '123',
      }
    }).finish();
    const message = await nc.request('get.entry', TIMEOUT, request);
    const response = message.data;
    const { error } = messages.entry.GetEntryResponse.decode(response);
    expect(error).toEqual({
      code: messages.entry.Error.Code.NOT_FOUND,
      message: 'oops'
    });
    nc.close();
  });
});