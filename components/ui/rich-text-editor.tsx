"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
	Bold, Italic, Underline as UnderlineIcon, Strikethrough,
	Heading1, Heading2, Heading3,
	AlignLeft, AlignCenter, AlignRight,
	Code, FileCode,
	Link as LinkIcon,
	Image as ImageIcon,
	Paperclip,
	X,
	FileText,
} from "lucide-react";

const lowlight = createLowlight(common);

export interface AttachmentPreview {
	id: string;
	url: string;
	file_name: string;
	mime_type: string;
	file_size: number;
}

interface RichTextEditorProps {
	value?: string;
	onChange?: (json: string) => void;
	onAttach?: (files: File[]) => Promise<void>;
	placeholder?: string;
	readOnly?: boolean;
	attachments?: AttachmentPreview[];
	onDeleteAttachment?: (id: string) => void;
	className?: string;
	minHeight?: number;
}

function isJsonContent(str: string): boolean {
	if (!str) return false;
	const trimmed = str.trim();
	return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function ToolbarButton({
	onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={cn(
				"w-6 h-6 flex items-center justify-center rounded text-ink-3 hover:bg-accent/60 hover:text-ink transition-colors",
				active && "bg-mint/15 text-mint",
			)}
		>
			{children}
		</button>
	);
}

function Divider() {
	return <div className="w-px h-4 bg-border/60 mx-0.5" />;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RichTextEditor({
	value,
	onChange,
	onAttach,
	placeholder = "Add a comment…",
	readOnly = false,
	attachments = [],
	onDeleteAttachment,
	className,
	minHeight = 80,
}: RichTextEditorProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ codeBlock: false }),
			Underline,
			Highlight,
			TextStyle,
			Color,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Link.configure({ openOnClick: false }),
			Image.configure({ inline: false, allowBase64: true }),
			CodeBlockLowlight.configure({ lowlight }),
		],
		content: value ? (isJsonContent(value) ? JSON.parse(value) : value) : "",
		editable: !readOnly,
		onUpdate: ({ editor: e }) => {
			onChange?.(JSON.stringify(e.getJSON()));
		},
		editorProps: {
			attributes: {
				class: "outline-none",
				"data-placeholder": placeholder,
			},
		},
	});

	// Sync value when it resets externally (e.g. after submit)
	useEffect(() => {
		if (!editor || readOnly) return;
		const currentJson = JSON.stringify(editor.getJSON());
		const isEmpty = value === "" || value === undefined || value === null;
		if (isEmpty && currentJson !== JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] })) {
			editor.commands.clearContent();
		}
	}, [value, editor, readOnly]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const prev = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("Enter URL", prev ?? "https://");
		if (url === null) return;
		if (!url) { editor.chain().focus().unsetLink().run(); return; }
		editor.chain().focus().setLink({ href: url }).run();
	}, [editor]);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length && onAttach) onAttach(files);
		e.target.value = "";
	}, [onAttach]);

	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

	useEffect(() => {
		if (!lightboxSrc) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxSrc(null); };
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [lightboxSrc]);

	if (readOnly) {
		return (
			<>
				<div
					className={cn(
						"prose prose-sm max-w-none text-ink text-xs leading-relaxed [&_a]:text-mint [&_a]:underline [&_code]:bg-accent/60 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-accent/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_img]:w-40 [&_img]:h-28 [&_img]:object-cover [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-zoom-in [&_img]:inline-block",
						className,
					)}
					onClick={(e) => {
						const target = e.target as HTMLElement;
						if (target.tagName === "IMG") setLightboxSrc((target as HTMLImageElement).src);
					}}
				>
					{editor ? (
						<EditorContent editor={editor} />
					) : (
						<p className="whitespace-pre-wrap">{value}</p>
					)}
					{attachments.length > 0 && (
						<AttachmentStrip attachments={attachments} readOnly onImageClick={setLightboxSrc} />
					)}
				</div>

				{/* Lightbox */}
				{lightboxSrc && (
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
						onClick={() => setLightboxSrc(null)}
					>
						<button
							type="button"
							onClick={() => setLightboxSrc(null)}
							className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
						>
							<X className="w-4 h-4 text-white" />
						</button>
						<img
							src={lightboxSrc}
							alt=""
							className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				)}
			</>
		);
	}

	return (
		<div className={cn("rounded-lg border border-border/40 bg-background focus-within:ring-1 focus-within:ring-mint/50 focus-within:border-mint/40 transition-colors", className)}>
			{/* Toolbar */}
			<div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/30 flex-wrap">
				<ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold">
					<Bold className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic">
					<Italic className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Underline">
					<UnderlineIcon className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Strikethrough">
					<Strikethrough className="w-3 h-3" />
				</ToolbarButton>

				<Divider />

				<ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Heading 1">
					<Heading1 className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Heading 2">
					<Heading2 className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Heading 3">
					<Heading3 className="w-3 h-3" />
				</ToolbarButton>

				<Divider />

				<ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Align left">
					<AlignLeft className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Align center">
					<AlignCenter className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Align right">
					<AlignRight className="w-3 h-3" />
				</ToolbarButton>

				<Divider />

				<ToolbarButton onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")} title="Inline code">
					<Code className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} title="Code block">
					<FileCode className="w-3 h-3" />
				</ToolbarButton>
				<ToolbarButton onClick={setLink} active={editor?.isActive("link")} title="Link">
					<LinkIcon className="w-3 h-3" />
				</ToolbarButton>

				{onAttach && (
					<>
						<Divider />
						<ToolbarButton onClick={() => fileInputRef.current?.click()} title="Attach file">
							<Paperclip className="w-3 h-3" />
						</ToolbarButton>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
							className="hidden"
							onChange={handleFileSelect}
						/>
					</>
				)}
			</div>

			{/* Editor area */}
			<div
				className="px-3 py-2 cursor-text prose prose-sm max-w-none text-ink text-xs leading-relaxed [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-ink-3/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_a]:text-mint [&_a]:underline [&_code]:bg-accent/60 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-accent/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_img]:w-40 [&_img]:h-28 [&_img]:object-cover [&_img]:rounded-lg [&_img]:my-1 [&_img]:inline-block"
				style={{ minHeight }}
				onClick={() => editor?.commands.focus()}
			>
				<EditorContent editor={editor} />
			</div>

			{/* Attachment preview strip */}
			{attachments.length > 0 && (
				<div className="border-t border-border/30 px-3 py-2">
					<AttachmentStrip
						attachments={attachments}
						onDelete={onDeleteAttachment}
					/>
				</div>
			)}
		</div>
	);
}

function AttachmentStrip({
	attachments, onDelete, readOnly = false, onImageClick,
}: { attachments: AttachmentPreview[]; onDelete?: (id: string) => void; readOnly?: boolean; onImageClick?: (url: string) => void }) {
	return (
		<div className="flex flex-wrap gap-2">
			{attachments.map((a) => {
				const isImage = a.mime_type.startsWith("image/");
				return (
					<div key={a.id} className="relative group/att">
						{isImage ? (
							onImageClick ? (
								<button type="button" onClick={() => onImageClick(a.url)}>
									<img
										src={a.url}
										alt={a.file_name}
										className="w-16 h-16 object-cover rounded-lg border border-border/40 hover:opacity-90 transition-opacity cursor-zoom-in"
									/>
								</button>
							) : (
							<a href={a.url} target="_blank" rel="noopener noreferrer">
								<img
									src={a.url}
									alt={a.file_name}
									className="w-16 h-16 object-cover rounded-lg border border-border/40 hover:opacity-90 transition-opacity"
								/>
							</a>
							)
						) : (
							<a
								href={a.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border/40 bg-accent/30 hover:bg-accent/50 transition-colors"
							>
								<FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" />
								<div className="min-w-0">
									<p className="text-[11px] text-ink truncate max-w-[100px]">{a.file_name}</p>
									<p className="text-[10px] text-ink-3">{formatBytes(a.file_size)}</p>
								</div>
							</a>
						)}
						{!readOnly && onDelete && (
							<button
								type="button"
								onClick={() => onDelete(a.id)}
								className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
								title="Remove attachment"
							>
								<X className="w-2.5 h-2.5" />
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}
