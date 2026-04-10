"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  AquariumId,
  FishId,
  HatId,
  PlazaBirdId,
  PlayerShopInventory,
} from "@/lib/shop/playerInventory";
import {
  PLAYER_SHOP_INVENTORY_CHANGE_EVENT,
  PLAYER_SHOP_INVENTORY_KEY,
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

  /** SSR uses defaults; after mount read real values from localStorage. */
  useLayoutEffect(() => {
    setInventoryState(loadPlayerShopInventory());
  }, []);

  useEffect(() => {
    const syncFromStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== PLAYER_SHOP_INVENTORY_KEY) return;
      setInventoryState(loadPlayerShopInventory());
    };
    const syncFromLocalEvent = () =>
      setInventoryState(loadPlayerShopInventory());
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(PLAYER_SHOP_INVENTORY_CHANGE_EVENT, syncFromLocalEvent);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(
        PLAYER_SHOP_INVENTORY_CHANGE_EVENT,
        syncFromLocalEvent
      );
    };
  }, []);

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

  const addOwnedVehicle = useCallback(
    (vehicleId: string) => {
      const id = vehicleId.trim().toLowerCase();
      patch((prev) => {
        if (prev.ownedVehicleIds.includes(id)) return prev;
        return { ...prev, ownedVehicleIds: [...prev.ownedVehicleIds, id] };
      });
    },
    [patch]
  );

  const addOwnedFish = useCallback(
    (id: FishId) => {
      patch((prev) => {
        if (prev.ownedFishIds.includes(id)) return prev;
        return { ...prev, ownedFishIds: [...prev.ownedFishIds, id] };
      });
    },
    [patch]
  );

  const addOwnedPlazaBird = useCallback(
    (id: PlazaBirdId) => {
      patch((prev) => {
        if (prev.ownedPlazaBirdIds.includes(id)) return prev;
        return {
          ...prev,
          ownedPlazaBirdIds: [...prev.ownedPlazaBirdIds, id],
        };
      });
    },
    [patch]
  );

  const addOwnedAquarium = useCallback(
    (id: AquariumId) => {
      patch((prev) => {
        if (prev.ownedAquariumIds.includes(id)) return prev;
        return { ...prev, ownedAquariumIds: [...prev.ownedAquariumIds, id] };
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
    addOwnedVehicle,
    addOwnedFish,
    addOwnedPlazaBird,
    addOwnedAquarium,
    isHatOwned,
  };
}
