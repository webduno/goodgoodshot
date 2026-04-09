"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import type { HatId, PlayerShopInventory } from "@/lib/shop/playerInventory";
import {
  loadPlayerShopInventory,
  savePlayerShopInventory,
} from "@/lib/shop/playerInventory";

function applySetStateAction<T>(
  prev: T,
  action: SetStateAction<T>
): T {
  return typeof action === "function"
    ? (action as (p: T) => T)(prev)
    : action;
}

export function usePlayerShopInventory() {
  const [inventory, setInventoryState] = useState<PlayerShopInventory>(() =>
    loadPlayerShopInventory()
  );

  const patch = useCallback(
    (fn: (prev: PlayerShopInventory) => PlayerShopInventory) => {
      setInventoryState((prev) => {
        const next = fn(prev);
        savePlayerShopInventory(next);
        return next;
      });
    },
    []
  );

  const setStrengthCharges: Dispatch<SetStateAction<number>> = useCallback(
    (action) => {
      patch((prev) => ({
        ...prev,
        strengthCharges: Math.max(
          0,
          applySetStateAction(prev.strengthCharges, action)
        ),
      }));
    },
    [patch]
  );

  const setNoBounceCharges: Dispatch<SetStateAction<number>> = useCallback(
    (action) => {
      patch((prev) => ({
        ...prev,
        noBounceCharges: Math.max(
          0,
          applySetStateAction(prev.noBounceCharges, action)
        ),
      }));
    },
    [patch]
  );

  const setNoWindCharges: Dispatch<SetStateAction<number>> = useCallback(
    (action) => {
      patch((prev) => ({
        ...prev,
        noWindCharges: Math.max(
          0,
          applySetStateAction(prev.noWindCharges, action)
        ),
      }));
    },
    [patch]
  );

  const setEquippedHatId = useCallback(
    (id: HatId | null) => {
      patch((prev) => {
        if (id !== null && !prev.ownedHats.includes(id)) {
          return prev;
        }
        return { ...prev, equippedHatId: id };
      });
    },
    [patch]
  );

  const addOwnedHat = useCallback(
    (id: HatId) => {
      patch((prev) => {
        if (prev.ownedHats.includes(id)) return prev;
        return { ...prev, ownedHats: [...prev.ownedHats, id] };
      });
    },
    [patch]
  );

  const isHatOwned = useCallback(
    (id: HatId) => inventory.ownedHats.includes(id),
    [inventory.ownedHats]
  );

  return {
    inventory,
    patch,
    setStrengthCharges,
    setNoBounceCharges,
    setNoWindCharges,
    setEquippedHatId,
    addOwnedHat,
    isHatOwned,
  };
}
