import React, { useEffect, useCallback, useState } from "react";
import { Button, YStack, Text } from "tamagui";

import type { Card } from "../pomelo/utils/types";
import { getCards, createCard } from "../utils/pomelo/client";

export default function Cards() {
  const [cards, setCards] = useState<Card[]>();
  const [x, setX] = useState<string>();
  const [loading, setLoading] = useState(true);
  async function fetchCards() {
    setLoading(true);
    try {
      const c = await getCards();

      setCards(c);
    } catch (error) {
      setX(error instanceof Error ? error.message : "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void fetchCards();
  }, []);
  const handleClick = useCallback(async () => {
    const card = await createCard();
    setX(JSON.stringify(card));
    await fetchCards();
  }, []);

  return (
    <YStack>
      <Text>
        {loading ? "loading" : ""}
        {x}
      </Text>
      {cards?.map((card) => (
        <YStack key={card.id} borderWidth={1} borderColor="black">
          <Text>
            {card.card_type} {card.provider}
          </Text>
          <Text>{card.last_four} </Text>
        </YStack>
      ))}
      <Button onPress={handleClick}>create</Button>
    </YStack>
  );
}
