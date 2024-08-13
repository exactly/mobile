use abi::{entrypoint::events::AccountDeployed, erc20::events::Transfer};
use pb::exa::{Accounts, Transfers};
use substreams::{
  errors::Error,
  hex,
  store::{StoreGet, StoreGetProto, StoreNew, StoreSet, StoreSetProto},
  Hex,
};
use substreams_ethereum::pb::eth::v2::Block;

mod abi;
#[allow(clippy::all)]
mod pb;

#[substreams::handlers::map]
pub fn map_accounts(block: Block) -> Result<Accounts, Error> {
  Ok(Accounts {
    accounts: block
      .events::<AccountDeployed>(&[&hex!("5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")])
      .filter_map(|(event, _)| match event.factory.as_slice() {
        hex!("6E1b5A67adD32E8dC034c23b8022b54821ED297b") => Some(event.sender),
        _ => None,
      })
      .collect(),
  })
}

#[substreams::handlers::store]
pub fn store_accounts(accounts: Accounts, store: StoreSetProto<Vec<u8>>) {
  for account in accounts.accounts {
    store.set(0, format!("account:{}", Hex(&account)), &account);
  }
}

#[substreams::handlers::map]
pub fn map_transfers(block: Block, store: StoreGetProto<Vec<u8>>) -> Result<Transfers, Error> {
  Ok(Transfers {
    receivers: block
      .events::<Transfer>(&[&hex!("0b2c639c533813f4aa9d7837caf62653d097ff85")])
      .filter_map(|(event, _)| match store.get_last(format!("account:{}", Hex(&event.to))) {
        Some(account) if !event.value.is_zero() => Some(account),
        _ => None,
      })
      .collect(),
  })
}
