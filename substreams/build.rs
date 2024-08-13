use anyhow::{Error, Ok, Result};
use std::process::Command;
use substreams_ethereum::Abigen;

fn main() -> Result<(), Error> {
  Abigen::new("EntryPoint", "abi/entrypoint.json")?.generate()?.write_to_file("src/abi/entrypoint.rs")?;

  Command::new("substreams").arg("protogen").status().expect("substreams protogen failed");

  Ok(())
}
