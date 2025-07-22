export default [
  {
    type: "function",
    name: "getBorrowBalance",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBorrowSequenceCallData",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "targets", type: "address[]", internalType: "address[]" },
      { name: "callDatas", type: "bytes[]", internalType: "bytes[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHealthFactor",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRepaySequenceCallData",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "targets", type: "address[]", internalType: "address[]" },
      { name: "callDatas", type: "bytes[]", internalType: "bytes[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSupplyBalance",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSupplyCallData",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "target", type: "address", internalType: "address" },
      { name: "callData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserPosition",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      {
        name: "markets",
        type: "tuple[]",
        internalType: "struct TezoroLendingLib.Market[]",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ILendingAdapter.UserPosition",
        components: [
          {
            name: "debts",
            type: "tuple[]",
            internalType: "struct ILendingAdapter.UserDebt[]",
            components: [
              { name: "token", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
          },
          {
            name: "collaterals",
            type: "tuple[]",
            internalType: "struct ILendingAdapter.UserCollateral[]",
            components: [
              { name: "token", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
              {
                name: "liquidationThresholdBps",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWithdrawCallData",
    inputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct TezoroLendingLib.Market",
        components: [
          { name: "loanToken", type: "address", internalType: "address" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "marketAddress", type: "address", internalType: "address" },
          { name: "auxId", type: "bytes32", internalType: "bytes32" },
          { name: "flags", type: "uint16", internalType: "uint16" },
        ],
      },
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "target", type: "address", internalType: "address" },
      { name: "callData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protocolCode",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
    stateMutability: "view",
  },
] as const;
