"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { usePersistentState } from "@/hooks/use-persistent-state";
import type { TopicMasteryState } from "@/lib/learning";

const SELECTED_TOPICS_STORAGE_KEY = "autotest:weak-topics:selected";
const TOPIC_STATE_STORAGE_KEY = "autotest:weak-topics:states";
const INITIALIZED_STORAGE_KEY = "autotest:weak-topics:initialized";
const EMPTY_SELECTED_TOPICS: string[] = [];
const EMPTY_TOPIC_STATES: Record<string, TopicMasteryState> = {};

type WeakTopicPreference = {
  topic: string;
  state: TopicMasteryState;
};

const stateRank: Record<TopicMasteryState, number> = {
  weak: 0,
  improving: 1,
  stable: 2,
  mastered: 3,
};

function normalizeTopic(value: string) {
  return value.trim().toLowerCase();
}

function uniqueTopics(topics: string[]) {
  const seen = new Set<string>();
  return topics.filter((topic) => {
    const normalized = normalizeTopic(topic);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export function useWeakTopicPreferences(items: WeakTopicPreference[]) {
  const [selectedTopics, setSelectedTopics, selectedHydrated] = usePersistentState<string[]>(
    SELECTED_TOPICS_STORAGE_KEY,
    EMPTY_SELECTED_TOPICS,
  );
  const [topicStates, setTopicStates, topicStatesHydrated] = usePersistentState<Record<string, TopicMasteryState>>(
    TOPIC_STATE_STORAGE_KEY,
    EMPTY_TOPIC_STATES,
  );
  const [initialized, setInitialized, initializedHydrated] = usePersistentState<boolean>(
    INITIALIZED_STORAGE_KEY,
    false,
  );
  const [improvedTopics, setImprovedTopics] = useState<Record<string, true>>({});
  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        topic: item.topic,
        state: item.state,
        normalizedTopic: normalizeTopic(item.topic),
      })),
    [items],
  );
  const availableTopicSet = useMemo(
    () => new Set(normalizedItems.map((item) => item.normalizedTopic)),
    [normalizedItems],
  );

  useEffect(() => {
    if (!selectedHydrated || normalizedItems.length === 0) {
      return;
    }

    setSelectedTopics((current) => {
      const filtered = uniqueTopics(current).filter((topic) => availableTopicSet.has(normalizeTopic(topic)));
      if (filtered.length === current.length && filtered.every((topic, index) => topic === current[index])) {
        return current;
      }
      return filtered;
    });
  }, [availableTopicSet, normalizedItems.length, selectedHydrated, setSelectedTopics]);

  useEffect(() => {
    if (!selectedHydrated || !initializedHydrated || initialized || normalizedItems.length === 0) {
      return;
    }

    setSelectedTopics(uniqueTopics(normalizedItems.slice(0, 2).map((item) => item.topic)));
    setInitialized(true);
  }, [initialized, initializedHydrated, normalizedItems, selectedHydrated, setInitialized, setSelectedTopics]);

  useEffect(() => {
    if (!topicStatesHydrated || normalizedItems.length === 0) {
      return;
    }

    const visibleTopicKeys = new Set(normalizedItems.map((item) => item.normalizedTopic));
    const nextTopicStates: Record<string, TopicMasteryState> = {};
    const nextImprovedTopics: Record<string, true> = {};

    for (const item of normalizedItems) {
      const key = item.normalizedTopic;
      const previousState = topicStates[key];
      nextTopicStates[key] = item.state;
      if (previousState && stateRank[item.state] > stateRank[previousState]) {
        nextImprovedTopics[key] = true;
      }
    }

    let changed = false;
    const currentKeys = Object.keys(topicStates);
    const nextKeys = Object.keys(nextTopicStates);
    if (currentKeys.length !== nextKeys.length) {
      changed = true;
    } else {
      for (const key of nextKeys) {
        if (topicStates[key] !== nextTopicStates[key]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      const prunedTopicStates: Record<string, TopicMasteryState> = {};
      for (const key of nextKeys) {
        if (visibleTopicKeys.has(key)) {
          prunedTopicStates[key] = nextTopicStates[key];
        }
      }
      setTopicStates(prunedTopicStates);
    }

    if (Object.keys(nextImprovedTopics).length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setImprovedTopics(nextImprovedTopics);
    });
    const timeoutId = window.setTimeout(() => setImprovedTopics({}), 1000);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [normalizedItems, setTopicStates, topicStates, topicStatesHydrated]);

  const selectedTopicSet = useMemo(
    () => new Set(selectedTopics.map((topic) => normalizeTopic(topic))),
    [selectedTopics],
  );
  const isSelected = useCallback(
    (topic: string) => selectedTopicSet.has(normalizeTopic(topic)),
    [selectedTopicSet],
  );
  const isImproved = useCallback(
    (topic: string) => Boolean(improvedTopics[normalizeTopic(topic)]),
    [improvedTopics],
  );

  const toggleTopic = useCallback((topic: string) => {
    const normalizedTopic = normalizeTopic(topic);
    if (!availableTopicSet.has(normalizedTopic)) {
      return;
    }

    setSelectedTopics((current) => {
      const exists = current.some((item) => normalizeTopic(item) === normalizedTopic);
      if (exists) {
        return current.filter((item) => normalizeTopic(item) !== normalizedTopic);
      }
      return [...current, topic];
    });
  }, [availableTopicSet, setSelectedTopics]);

  const rememberTopic = useCallback((topic: string) => {
    const normalizedTopic = normalizeTopic(topic);
    if (!availableTopicSet.has(normalizedTopic)) {
      return;
    }

    setSelectedTopics((current) => {
      if (current.some((item) => normalizeTopic(item) === normalizedTopic)) {
        return current;
      }
      return [...current, topic];
    });
  }, [availableTopicSet, setSelectedTopics]);

  const clearSelection = useCallback(() => setSelectedTopics([]), [setSelectedTopics]);

  return useMemo(
    () => ({
      selectedTopics,
      isSelected,
      isImproved,
      toggleTopic,
      rememberTopic,
      clearSelection,
    }),
    [clearSelection, isImproved, isSelected, rememberTopic, selectedTopics, toggleTopic],
  );
}
