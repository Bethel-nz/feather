import {
  credentials,
  loadPackageDefinition,
  Metadata,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import path from 'path';

let clients: Record<string, any> = {};

function loadService(serviceName: string) {
  const protoPath = path.join(process.cwd(), '..', 'proto', 'feather', 'v1', 'flag.proto');
  const packageDef = loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = loadPackageDefinition(packageDef) as any;
  return grpcObj.feather.v1[serviceName];
}

function getClient(serviceName: string, address: string): any {
  const key = `${serviceName}@${address}`;
  if (clients[key]) return clients[key];
  const Service = loadService(serviceName);
  const client = new Service(address, credentials.createInsecure());
  clients[key] = client;
  return client;
}

function call(
  client: any,
  method: string,
  request: object,
  jwt?: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const callback = (err: any, res: any) => {
      if (err) reject(err);
      else resolve(res);
    };

    if (jwt) {
      const meta = new Metadata();
      meta.add('authorization', `Bearer ${jwt}`);
      client[method](request, meta, {}, callback);
    } else {
      client[method](request, callback);
    }
  });
}

export function auth(address = 'localhost:50051') {
  const client = getClient('AuthService', address);
  return {
    signUp: (req: { email: string; password: string }) =>
      call(client, 'SignUp', req),
    logIn: (req: { email: string; password: string }) =>
      call(client, 'LogIn', req),
  };
}

export function flags(address = 'localhost:50052') {
  const client = getClient('FlagService', address);
  return {
    listFlags: (jwt: string) =>
      call(client, 'ListFlags', {}, jwt),
    createFlag: (req: {
      key: string;
      description: string;
      enabled: boolean;
      rolloutPercentage: number;
    }, jwt: string) =>
      call(client, 'CreateFlag', req, jwt),
    toggleFlag: (req: { key: string; enabled: boolean }, jwt: string) =>
      call(client, 'ToggleFlag', req, jwt),
    updateRollout: (req: { key: string; rolloutPercentage: number }, jwt: string) =>
      call(client, 'UpdateRollout', req, jwt),
    evaluate: (req: { key: string; contextKey: string }, sdkKey: string) =>
      call(client, 'Evaluate', req, sdkKey),
  };
}
