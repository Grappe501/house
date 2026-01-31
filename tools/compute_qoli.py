#!/usr/bin/env python3
"""Compute QoLI outputs from scenario assumptions and domain indicator definitions.

This starter script is intentionally simple:
- Loads /data/qoli/config.json, scenarios.json, households.json, and domains/*.json
- Produces /data/qoli/outputs/<household_key>.json

Replace placeholder scoring with real indicator math as the model matures.
"""
import json, os, datetime, glob

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA = os.path.join(ROOT, "data", "qoli")

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

def main():
    config = load(os.path.join(DATA, "config.json"))
    households = load(os.path.join(DATA, "households.json"))["households"]
    scenarios = load(os.path.join(DATA, "scenarios.json"))["scenarios"]

    domains = {}
    for p in glob.glob(os.path.join(DATA, "domains", "*.json")):
        d = load(p)
        domains[d["domain_key"]] = d

    # Placeholder scoring: equal weights and a simple placeholder delta for WMR
    # Replace this with real indicator aggregation + cost modeling.
    timepoints = [str(y) for y in config["timepoints_years"]]
    out_dir = os.path.join(DATA, "outputs")
    os.makedirs(out_dir, exist_ok=True)

    for hh in households:
        base = 50
        result = {
            "household_key": hh["key"],
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "timepoints": {},
            "disclaimer": "Starter output: placeholder scoring only. Replace with computed results as indicators and assumptions are populated."
        }
        for t in timepoints:
            year = int(t)
            # illustrative placeholder: status quo slowly declines, WMR improves over time
            status = max(0, base - (year//5)*2)
            wmr = min(100, base + 5 + (year//5)*6)
            result["timepoints"][t] = {
                "status_quo": {"qoli": status, "domains": {}},
                "wmr": {"qoli": wmr, "domains": {}}
            }
        save(os.path.join(out_dir, f"{hh['key']}.json"), result)

    print("QoLI outputs generated in:", out_dir)

if __name__ == "__main__":
    main()
