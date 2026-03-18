"use client";

import { useEffect, useMemo, useState } from "react";

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

  const availableTopics = useMemo(() => items.map((item) => item.topic), [items]);
  const availableTopicSet = useMemo(
    () => new Set(availableTopics.map((topic) => normalizeTopic(topic))),
    [availableTopics],
  );

  useEffect(() => {
    if (!selectedHydrated || items.length === 0) {
      return;
    }

    setSelectedTopics((current) => {
      const filtered = uniqueTopics(current).filter((topic) => availableTopicSet.has(normalizeTopic(topic)));
      if (filtered.length === current.length && filtered.every((topic, index) => topic === current[index])) {
        return current;
      }
      return filtered;
    });
  }, [availableTopicSet, selectedHydrated, setSelectedTopics]);

  useEffect(() => {
    if (!selectedHydrated || !initializedHydrated || initialized || items.length === 0) {
      return;
    }

    setSelectedTopics(uniqueTopics(items.slice(0, 2).map((item) => item.topic)));
    setInitialized(true);
  }, [initialized, initializedHydrated, items, selectedHydrated, setInitialized, setSelectedTopics]);

  useEffect(() => {
    if (!topicStatesHydrated || items.length === 0) {
      return;
    }

    const visibleTopicKeys = new Set(items.map((item) => normalizeTopic(item.topic)));
    const nextTopicStates: Record<string, TopicMasteryState> = {};
    const nextImprovedTopics: Record<string, true> = {};

    for (const item of items) {
      const key = normalizeTopic(item.topic);
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

    setImprovedTopics(nextImprovedTopics);
    const timeoutId = window.setTimeout(() => setImprovedTopics({}), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [items, setTopicStates, topicStates, topicStatesHydrated]);

  const selectedTopicSet = useMemo(
    () => new Set(selectedTopics.map((topic) => normalizeTopic(topic))),
    [selectedTopics],
  );

  const toggleTopic = (topic: string) => {
    setSelectedTopics((current) => {
      const normalizedTopic = normalizeTopic(topic);
      const exists = current.some((item) => normalizeTopic(item) === normalizedTopic);
      if (exists) {
        return current.filter((item) => normalizeTopic(item) !== normalizedTopic);
      }
      return [...current, topic];
    });
  };

  const rememberTopic = (topic: string) => {
    setSelectedTopics((current) => {
      if (current.some((item) => normalizeTopic(item) === normalizeTopic(topic))) {
        return current;
      }
      return [...current, topic];
    });
  };

  const clearSelection = () => setSelectedTopics([]);

  return {
    selectedTopics,
    isSelected: (topic: string) => selectedTopicSet.has(normalizeTopic(topic)),
    isImproved: (topic: string) => Boolean(improvedTopics[normalizeTopic(topic)]),
    toggleTopic,
    rememberTopic,
    clearSelection,
  };
}
