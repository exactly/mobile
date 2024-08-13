use abi::entrypoint::events::AccountDeployed;
use pb::exa::Accounts;
use substreams::{
  errors::Error,
  hex,
  store::{StoreNew, StoreSet, StoreSetProto},
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
