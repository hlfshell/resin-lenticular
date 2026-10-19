import { test, expect } from "vitest";
import { saveProject, loadProject, matchSources } from "../src/core/project";
import { defaults, fit, type Project } from "../src/core/model";
const project: Project = {
  version: 1,
  settings: defaults,
  sources: [
    {
      id: "a",
      name: "original.png",
      hash: "a".repeat(64),
      width: 10,
      height: 20,
      placement: fit(10, 20, defaults),
    },
  ],
};
test("YAML restores settings and matches renamed bytes, not changed same-name files", () => {
  expect(loadProject(saveProject(project))).toEqual(project);
  expect(
    matchSources(project.sources, [
      { ...project.sources[0], id: "b", name: "renamed.png" },
    ]),
  ).toEqual(["b"]);
  expect(
    matchSources(project.sources, [
      { ...project.sources[0], hash: "b".repeat(64) },
    ]),
  ).toEqual([null]);
  expect(() => loadProject("version: 900")).toThrow();
  expect(() =>
    loadProject(
      saveProject({ ...project, settings: { ...defaults, ppi: -1 } }),
    ),
  ).toThrow();
});
