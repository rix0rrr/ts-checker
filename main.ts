const ENVIRONMENT_TABLE = table<Environment>().partitionKey('account').sortKey('region').done();
const ALLOCATION_TABLE = table<Allocation>().partitionKey('allocationId').done();
const ENVIRONMENTS = staticCollection<PredefinedEnvironment>();

interface PredefinedEnvironment {
  account: string;
  region: string;
  // pool left out on purpose
}

interface Environment {
  allocationId: string;
  account: string;
  region: string;
  status: 'in-use' | 'cleaning' | 'dirty';
}

interface Allocation {
  allocationId: string;
  account: string;
  region: string;
  requester: string;
  end?: boolean;
  // pool left out on purpose
}

interface AllocateInput {
  requester: string;
}

interface AllocateOutput {
  id: string;
}

async function allocate(input: AllocateInput): Promise<AllocateOutput> {
  const allocationId = uniqueString();

  for (const x of ENVIRONMENTS) {
    if (ENVIRONMENT_TABLE.putIfNew({ account: x.account, region: x.region, allocationId, status: 'in-use' })) {
      ALLOCATION_TABLE.put({
        allocationId,
        account: x.account,
        region: x.region,
        requester: input.requester,
      });

      later(() => {
        deallocate({ allocationId });
      });

      break;
    }
  }

  return { id: allocationId };
}

interface DeallocateInput {
  allocationId: string;
}

function deallocate(input: DeallocateInput) {
  const success = ALLOCATION_TABLE.conditionalUpdate({ allocationId: input.allocationId }, {
    end: true,
  }, current => current.end === undefined);
  assert(success);
}


// Create parallel requests with any possible input, including the return value of any previous API call

// Assertions --