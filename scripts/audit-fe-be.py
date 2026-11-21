#!/usr/bin/env python3
"""
AUDIT FE ↔ BE — so khớp tĩnh mọi lời gọi API trong src/lib/api/*.ts
với OpenAPI spec của BE (docs-json).

Kiểm tra:
  1. Path FE (kể cả template literal) tồn tại trong BE (khớp cấu trúc {param})
  2. HTTP method khớp
  3. Query param FE ⊆ query param BE khai báo
  4. Body keys FE ⊆ properties của requestBody schema BE
  5. Multipart field name (formData.append) ⊢ BE requestBody multipart schema
  6. Coverage: ops BE chưa được FE gọi

Usage:
  python3 scripts/audit-fe-be.py [openapi.json]

Output: báo cáo text ra stdout + scripts/audit-result.json chi tiết.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_DIR = ROOT / "src" / "lib" / "api"

METHODS = {"get", "post", "put", "patch", "delete"}


# ------------------------------------------------------------------ utils

def path_to_regex(path: str) -> re.Pattern:
    """'/a/{id}/b' → regex '^/a/[^/]+/b$'."""
    parts = path.strip("/").split("/")
    segs = []
    for seg in parts:
        segs.append("[^/]+" if re.fullmatch(r"\{[^}]+\}", seg) else re.escape(seg))
    return re.compile("^/" + "/".join(segs) + "$")


def fe_template_to_pattern(tmpl: str) -> str:
    """/x/${...}/y → /x/{p}/y (chỉ giữ cấu trúc segment)."""
    return re.sub(r"\$\{[^}]*\}", "{p}", tmpl)


def norm_query(path_tmpl: str) -> tuple[str, list[str]]:
    """Tách query khỏi path template → (path, [tên query param])."""
    if "?" not in path_tmpl:
        return path_tmpl, []
    base, qs = path_tmpl.split("?", 1)
    params = []
    for chunk in qs.split("&"):
        if not chunk:
            continue
        name = chunk.split("=", 1)[0]
        if not name or re.fullmatch(r"\$\{[^}]*\}", chunk):
            continue  # query string build động toàn bộ — bỏ qua
        params.append(name)
    return base, params


def split_top(buf: str) -> list[str]:
    """Tách object-literal body theo dấu phẩy top-level (trừ trong chuỗi/lồng)."""
    out, depth, in_str, cur = [], 0, None, ""
    j = 0
    while j < len(buf):
        c = buf[j]
        if in_str:
            if c == "\\":
                cur += buf[j : j + 2]
                j += 2
                continue
            if c == in_str:
                in_str = None
            cur += c
        elif c in "\"'`":
            in_str = c
            cur += c
        elif c in "{[(":
            depth += 1
            cur += c
        elif c in "}])":
            depth -= 1
            cur += c
        elif c == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += c
        j += 1
    if cur.strip():
        out.append(cur)
    return out


def extract_body_keys(src: str, anchor: int, window: int = 3000) -> list[str] | None:
    """Trích top-level keys của object literal ngay sau 'body: {' (vị trí anchor)."""
    i = src.find("{", anchor)
    if i < 0 or i - anchor > 40:
        return None
    depth = 0
    buf = ""
    in_str = None
    j = i
    end = min(len(src), i + window)
    while j < end:
        c = src[j]
        if in_str:
            if c == "\\":
                buf += src[j : j + 2]
                j += 2
                continue
            if c == in_str:
                in_str = None
            buf += c
        elif c in "\"'`":
            in_str = c
            buf += c
        elif c == "{":
            depth += 1
            if depth == 1:
                j += 1
                continue
            buf += c
        elif c == "}":
            depth -= 1
            if depth == 0:
                break
            buf += c
        else:
            buf += c
        j += 1
    keys = []
    for part in split_top(buf):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*:", part)
        if m:
            keys.append(m.group(1))
            continue
        m = re.match(r"^([A-Za-z_$][\w$]*)$", part)  # shorthand {status,}
        if m:
            keys.append(m.group(1))
    return keys or None


# -------------------------------------------------------- FE call extraction

CALL_RE = re.compile(r"\b(?:request|apiFetch)\s*(?:<[^<>]{0,80}>)?\s*\(")
METHOD_RE = re.compile(r'method:\s*"([A-Z]+)"')
BODY_OBJ_RE = re.compile(r"body:\s*\{")
APPEND_RE = re.compile(r'\.append\(\s*["\']([A-Za-z0-9_]+)["\']')
METHOD_RE = re.compile(r'method:\s*"([A-Z]+)"')
BODY_OBJ_RE = re.compile(r"body:\s*\{")
APPEND_RE = re.compile(r'\.append\(\s*["\']([A-Za-z0-9_]+)["\']')

# Transport wrappers — bản thân chúng gọi path động, không phải định nghĩa API.
SKIP_FILES = {"client.ts", "api-client.ts"}

def find_call_span(src: str, open_paren_end: int) -> int:
    """Vị trí đóng ')' của call, bỏ qua chuỗi/template/comment (mở tại open_paren_end-1)."""
    depth = 1
    i = open_paren_end
    in_str = None
    while i < len(src) and depth > 0:
        c = src[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "\"'`":
            in_str = c
        elif c == "/" and src[i : i + 2] == "//":
            nl = src.find("\n", i)
            i = nl if nl > 0 else len(src)
            continue
        elif c == "/" and src[i : i + 2] == "/*":
            cm = src.find("*/", i)
            i = cm + 2 if cm > 0 else len(src)
            continue
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_calls(src: str, file: str) -> list[dict]:
    """Mọi call request(...)/apiFetch(...) → path, method, query, bodyKeys, formFields
    trích ĐÚNG trong span của call (paren matching) — không bleed từ call kế cận."""
    if file in SKIP_FILES:
        return []
    calls = []
    for m in CALL_RE.finditer(src):
        close = find_call_span(src, m.end())
        if close < 0:
            continue
        span = src[m.start() : close + 1]
        wm = re.search(r"([`\"'])((?:\\.|(?!\1).)*)\1", span, re.S)
        if not wm:
            continue
        raw_path = wm.group(2)
        if not raw_path.lstrip().startswith("/"):
            calls.append({"file": file, "raw": raw_path[:60], "dynamic": True,
                          "method": "GET", "query": [], "bodyKeys": None, "formFields": []})
            continue
        # query params lấy từ RAW (trước khi thay {p}), bỏ qua query build động
        base_raw, query = norm_query(raw_path)
        query_dynamic = "${" in (raw_path.split("?", 1)[1] if "?" in raw_path else "")
        # template ở CUỐI path, không đứng sau '/' → query suffix động (vd /sprints${query})
        mq = re.search(r"\$\{[a-zA-Z_][\w$]*\}$", base_raw)
        if mq and not base_raw[: mq.start()].endswith("/"):
            base_raw = base_raw[: mq.start()]
            query_dynamic = True
        base = fe_template_to_pattern(base_raw)
        meth = METHOD_RE.search(span[wm.end() :])
        method = meth.group(1).lower() if meth else "get"
        body_keys = None
        bm = BODY_OBJ_RE.search(span[wm.end() :])
        if bm:
            body_keys = extract_body_keys(span, wm.end() + bm.start() + len("body:"))
        form_fields = APPEND_RE.findall(src[max(0, m.start() - 1500) : m.start()]) or []
        calls.append({
            "file": file, "raw": raw_path, "base": base, "method": method,
            "query": query, "queryDynamic": query_dynamic,
            "bodyKeys": body_keys, "formFields": form_fields,
            "line": src[: m.start()].count("\n") + 1,
        })
    return calls


# ------------------------------------------------------------ OpenAPI utils

def deref(spec: dict, node) -> dict | None:
    while isinstance(node, dict) and "$ref" in node:
        ref = node["$ref"].lstrip("#/").split("/")
        cur: dict = spec
        for p in ref:
            cur = cur.get(p, {}) if isinstance(cur, dict) else {}
        node = cur
    return node if isinstance(node, dict) else None


def op_query_params(spec: dict, op: dict, path_item: dict | None = None) -> set[str]:
    names = set()
    for p in (path_item or {}).get("parameters", []) or []:
        if p.get("in") == "query":
            names.add(p["name"])
    for p in op.get("parameters", []) or []:
        if p.get("in") == "query":
            names.add(p["name"])
    return names


def op_body_schema(spec: dict, op: dict, content_type: str) -> dict | None:
    rb = deref(spec, op.get("requestBody", {})) or {}
    content = rb.get("content", {}).get(content_type, {})
    return deref(spec, content.get("schema", {}))


def schema_keys(spec: dict, schema: dict) -> tuple[set[str], set[str]]:
    """(properties, required) — gộp allOf."""
    props: set[str] = set()
    req: set[str] = set()
    if not schema:
        return props, req
    for sub in schema.get("allOf", []) or []:
        s = deref(spec, sub) or {}
        p, r = schema_keys(spec, s)
        props |= p
        req |= r
    props |= set((schema.get("properties") or {}).keys())
    req |= set(schema.get("required") or [])
    return props, req


# -------------------------------------------------------------------- main

def main() -> int:
    spec_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/openapi.json")
    spec = json.loads(spec_path.read_text())
    paths: dict[str, dict] = spec.get("paths", {})

    # index BE: (method, regex) → (path, op)
    be_index: list[tuple[str, re.Pattern, str, dict, dict]] = []
    be_ops: set[tuple[str, str]] = set()
    for p, item in paths.items():
        # spec khai báo path kèm prefix /api/v1 — FE gọi path tương đối sau base
        p_rel = re.sub(r"^/api/v1", "", p) or "/"
        for meth, op in item.items():
            if meth not in METHODS:
                continue
            be_index.append((meth, path_to_regex(p_rel), p_rel, op, item))
            be_ops.add((meth.upper(), p_rel))

    fe_calls: list[dict] = []
    for f in sorted(API_DIR.glob("*.ts")):
        fe_calls.extend(extract_calls(f.read_text(), f.name))

    report = {"matched": [], "mismatch": [], "dynamic": [], "coverage_missing": []}
    called: set[tuple[str, str]] = set()

    for call in fe_calls:
        if call.get("dynamic"):
            report["dynamic"].append(call)
            continue
        base, method = call["base"], call["method"]
        hits = [(bm, bp, op, pi) for bm, brx, bp, op, pi in be_index if bm == method and brx.match(base)]
        if not hits:
            # thử method khác để chẩn đoán
            alt = [(bm, bp) for bm, brx, bp, _, _ in be_index if brx.match(base)]
            report["mismatch"].append({
                **{k: call.get(k) for k in ("file", "line", "raw", "method", "query", "bodyKeys")},
                "error": "PATH_NOT_FOUND" + (f" (BE có path này ở method {sorted({m.upper() for m, _ in alt})})"
                                              if alt else ""),
            })
            continue
        _, be_path, op, path_item = hits[0]
        called.add((method.upper(), be_path))
        issues = []
        # query params
        be_q = op_query_params(spec, op, path_item)
        fe_q = set(call["query"])
        if call.get("queryDynamic"):
            fe_q = set()  # query build động — không audit tĩnh được
        extra = fe_q - be_q
        if extra:
            issues.append({"type": "QUERY_EXTRA", "detail": sorted(extra),
                           "be_allows": sorted(be_q)})
        # body keys
        if call["bodyKeys"]:
            schema = op_body_schema(spec, op, "application/json")
            props, req = schema_keys(spec, schema or {})
            if props:
                extra_b = set(call["bodyKeys"]) - props
                if extra_b:
                    issues.append({"type": "BODY_EXTRA", "detail": sorted(extra_b),
                                   "be_props": sorted(props)})
                missing_req = req - set(call["bodyKeys"])
                if missing_req:
                    issues.append({"type": "BODY_MISSING_REQUIRED", "detail": sorted(missing_req)})
            else:
                issues.append({"type": "BODY_SCHEMA_UNKNOWN", "detail": "BE không khai báo JSON body"})
        # multipart
        if call["formFields"]:
            schema = op_body_schema(spec, op, "multipart/form-data")
            props, _ = schema_keys(spec, schema or {})
            bad = set(call["formFields"]) - props if props else set()
            if bad:
                issues.append({"type": "FORM_FIELD_INVALID", "detail": sorted(bad),
                               "be_props": sorted(props)})
        entry = {"file": call["file"], "line": call["line"], "raw": call["raw"],
                 "method": method.upper(), "be_path": be_path}
        (report["mismatch"] if issues else report["matched"]).append(
            {**entry, **({"issues": issues} if issues else {})})

    # coverage: ops BE chưa được gọi
    for meth, p in sorted(be_ops):
        if (meth, p) not in called:
            report["coverage_missing"].append({"method": meth, "path": p})

    # in báo cáo
    print(f"FE calls: {len(fe_calls)} (dynamic: {len(report['dynamic'])})")
    print(f"  ✅ matched: {len(report['matched'])}")
    print(f"  ❌ mismatch: {len(report['mismatch'])}")
    for m in report["mismatch"]:
        print(f"     - [{m['file']}:{m.get('line')}] {m.get('method', '').upper()} {m['raw'][:80]}"
              + (f" → {m['error']}" if "error" in m else ""))
        for i in m.get("issues", []):
            print(f"         · {i['type']}: {i['detail']}")
    for d in report["dynamic"]:
        print(f"     ⚠ dynamic path: [{d['file']}] {d['raw']}")
    print(f"  📋 BE ops chưa được FE gọi: {len(report['coverage_missing'])}/{len(be_ops)}")
    out = ROOT / "scripts" / "audit-result.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Chi tiết: {out}")
    return 1 if report["mismatch"] else 0


if __name__ == "__main__":
    sys.exit(main())
