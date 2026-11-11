# scripts/generate_index.py
import yaml
from pathlib import Path

def extract_title(md_path):
    """从 Markdown 文件中提取第一个一级标题"""
    try:
        with open(md_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('# '):
                    return line[2:].strip()
    except Exception:
        pass
    return md_path.stem

def scan_directory_for_md_files(dir_path, docs_dir_abs):
    """扫描目录下所有 .md 文件（递归），返回 (title, rel_path) 列表"""
    results = []
    if not dir_path.exists():
        return results
    for md_file in sorted(dir_path.rglob('*.md')):
        if md_file.name == 'index.md':
            continue
        rel_path = md_file.relative_to(docs_dir_abs).as_posix()
        title = extract_title(md_file)
        results.append((title, rel_path))
    return results

def get_common_parent_path(file_paths):
    """从一组文件路径中提取公共父目录"""
    if not file_paths:
        return None
    first = Path(file_paths[0])
    common = first.parent
    for fp in file_paths[1:]:
        p = Path(fp)
        while not p.is_relative_to(common):
            common = common.parent
    return common

def collect_all_file_paths_from_nav_item(nav_item):
    """递归收集 nav 条目下所有的文件路径（字符串）"""
    paths = []
    if isinstance(nav_item, dict):
        for value in nav_item.values():
            paths.extend(collect_all_file_paths_from_nav_item(value))
    elif isinstance(nav_item, list):
        for elem in nav_item:
            paths.extend(collect_all_file_paths_from_nav_item(elem))
    elif isinstance(nav_item, str):
        # 排除非文件路径（如 Welcome）或简单判断包含扩展名或斜线
        if nav_item.endswith('.md') or '/' in nav_item:
            paths.append(nav_item)
    return paths

def process_nav_node(node, level, docs_dir_abs):
    """
    递归处理一个 nav 节点，返回 Markdown 行列表。
    node 可以是字典、列表或字符串。
    """
    lines = []
    indent = "  " * level
    if isinstance(node, dict):
        for title, sub in node.items():
            if title.lower() == 'welcome':
                continue
            if isinstance(sub, str):
                # 直接文件链接
                lines.append(f"{indent}- [{title}]({sub})")
            elif isinstance(sub, list):
                # 分类，有子项
                # 先递归处理原有子项（保持结构）
                sub_lines = []
                for child in sub:
                    sub_lines.extend(process_nav_node(child, level+1, docs_dir_abs))
                # 自动扫描：收集此分类下所有子文件的路径，确定公共目录
                all_paths = collect_all_file_paths_from_nav_item({title: sub})
                if all_paths:
                    common_dir = get_common_parent_path(all_paths)
                    if common_dir:
                        full_dir = docs_dir_abs / common_dir
                        if full_dir.exists():
                            scanned = scan_directory_for_md_files(full_dir, docs_dir_abs)
                            existing_paths = set(all_paths)
                            # 将扫描到的新文件添加为新的子项（格式为 - [标题](路径)）
                            new_items = []
                            for s_title, s_path in scanned:
                                if s_path not in existing_paths:
                                    new_items.append(f"{indent}  - [{s_title}]({s_path})")
                            # 将新项追加到 sub_lines 后面（保持原有顺序在前）
                            sub_lines.extend(new_items)
                if sub_lines:
                    # 输出分类标题（不可点击）
                    lines.append(f"{indent}- {title}")
                    lines.extend(sub_lines)
                else:
                    # 没有子项，只输出分类标题
                    lines.append(f"{indent}- {title}")
    elif isinstance(node, list):
        for elem in node:
            lines.extend(process_nav_node(elem, level, docs_dir_abs))
    elif isinstance(node, str):
        # 单独的字符串（如 Welcome 等），忽略
        pass
    return lines

def on_pre_build(config):
    config_file = Path.cwd() / 'mkdocs.yml'
    if not config_file.exists():
        config_file = Path(config.get('config_file_path', 'mkdocs.yml'))
    with open(config_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    nav = data.get('nav', [])
    docs_dir_abs = Path.cwd() / config['docs_dir']
    content_lines = process_nav_node(nav, 0, docs_dir_abs)
    content = "# Welcome to Open-RDMA\n\n" + "\n".join(content_lines)
    index_path = docs_dir_abs / 'index.md'
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)