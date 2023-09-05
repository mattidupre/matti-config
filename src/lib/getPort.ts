import getPortLib from 'get-port';

const PORT_TYPES = {
  root: 100,
} as const;

export const getPort = async (type: keyof typeof PORT_TYPES) => {
  const portBase = 3000; // TODO: Eventually set this up in monorepo config.
  return getPortLib({ port: portBase + PORT_TYPES[type] });
};
