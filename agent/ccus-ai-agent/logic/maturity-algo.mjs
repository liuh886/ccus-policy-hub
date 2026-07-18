import { computeGovernanceDeployment } from './governance-deployment-algo.mjs';

console.warn(
  'maturity-algo.mjs is deprecated; computing explicit governance–deployment metrics.'
);

computeGovernanceDeployment().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
