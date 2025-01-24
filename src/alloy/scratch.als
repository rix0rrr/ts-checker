sig AllocationId { }
sig Account { }
sig Region { }
sig Requester { }

sig Environment {
  allocationId: AllocationId,
  account: Account,
  region: Region,
  requester: Requester,
}

enum PC {
  P0, P1, P2, ...
}

sig OperationAllocate {
  pc: PC,
  x: Int,
}

pred allocate_step[o: OperationAllocate] {
  (o' = o)
  or (o.pc.last = P1 and ... and o'.pc.last = P2 and ...)
}

pred allocate_init[o: OperationAllocate] {
  o.pc = P0
}

pred init {
  all x: OperationAllocate | allocate_init[o]
}
