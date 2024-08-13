use anyhow::{Error, Ok, Result};
use std::process::Command;
use substreams_ethereum::Abigen;

fn main() -> Result<(), Error> {
  Abigen::new("EntryPoint", "abi/entrypoint.json")?.generate()?.write_to_file("src/abi/entrypoint.rs")?;
  Abigen::new("ERC20", "abi/erc20.json")?.generate()?.write_to_file("src/abi/erc20.rs")?;

  Command::new("substreams").arg("protogen").status().expect("substreams protogen failed");

  Ok(())
}
