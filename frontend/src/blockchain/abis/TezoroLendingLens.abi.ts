export default [
  {
    type: "function",
    name: "viewRewards",
    inputs: [
      { name: "agent", type: "address", internalType: "address" },
      { name: "protocolCode", type: "uint16", internalType: "uint16" },
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
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct TezoroLendingLib.RewardBalance[]",
        components: [
          {
            name: "market",
            type: "tuple",
            internalType: "struct TezoroLendingLib.Market",
            components: [
              { name: "loanToken", type: "address", internalType: "address" },
              {
                name: "collateralToken",
                type: "address",
                internalType: "address",
              },
              {
                name: "marketAddress",
                type: "address",
                internalType: "address",
              },
              { name: "auxId", type: "bytes32", internalType: "bytes32" },
              { name: "flags", type: "uint16", internalType: "uint16" },
            ],
          },
          {
            name: "rewardTokens",
            type: "address[]",
            internalType: "address[]",
          },
          { name: "amounts", type: "uint256[]", internalType: "uint256[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "error",
    name: "NoPriceAvailable",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "TokenUnsupported",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
] as const;
