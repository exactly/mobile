#!/usr/bin/env bash

read -ra input <<< "$(cast abi-decode "_()(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)" "$1" | sed 's/ .*//' | xargs)"

rate=$(BC_LINE_LENGTH=666 bc -l <<< "
  scale     = 2 * 18

  wad         = 1000000000000000000
  dstart      = ${input[0]} / wad
  dend        = ${input[1]} / wad
  dgrowth     = ${input[2]} / wad
  ratestart = ${input[3]} / wad
  rateend   = ${input[4]} / wad
  minrate     = ${input[5]} / wad
  linearr     = ${input[6]} / wad
  amountstime = ${input[7]} / wad
  total       = ${input[8]} / wad

  avgduration = amountstime / total
  linearrate = ratestart + (rateend - ratestart) * (avgduration - dstart) / (dend - dstart)

  nonlinearrate = ratestart + (rateend - ratestart) * e(dgrowth * l((avgduration - dstart) / (dend - dstart)))
  rate = minrate + linearrate * linearr + nonlinearrate * (1 - linearr)

  scale     = 0
  print rate * wad / 1
")

cast --to-uint256 -- "$rate" | tr -d '\n'
