'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  File as FileIcon, Upload, Trash2, Download, HardDrive, 
  Folder as FolderIcon, ChevronRight, Plus, Search, X, FolderPlus,
  Clock, User as UserIcon, MoreVertical, FileText, Image as ImageIcon,
  ChevronLeft, Code, Eye
} from 'lucide-react';
import api from '../lib/api';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface File {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  description?: string;
  folderId: string | null;
  createdAt: string;
  uploader: {
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export default function FileExplorer({ 
  workspaceId, 
  onSelect,
  isPicker = false
}: { 
  workspaceId: string;
  onSelect?: (file: File) => void;
  isPicker?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/files/workspace/${workspaceId}`);
      setFiles(data.files);
      setFolders(data.folders);
    } catch (err) {}
  };

  const handleViewCode = async (file: File) => {
    setPreviewFile(file);
    setLoadingPreview(true);
    setPreviewContent('');
    setEditContent('');
    setIsEditing(false);
    try {
        const response = await fetch(file.url);
        const text = await response.text();
        setPreviewContent(text);
        setEditContent(text);
    } catch (err) {
        setPreviewContent('Error loading file content.');
    } finally {
        setLoadingPreview(false);
    }
  };

  const handleSaveFile = async () => {
    if (!previewFile) return;
    try {
        await api.put(`/files/${previewFile.id}`, { content: editContent });
        setPreviewContent(editContent);
        setIsEditing(false);
        alert('File saved successfully!');
    } catch (err) {
        alert('Failed to save file');
    }
  };

  const createFolder = async () => {
    if (!newFolderName) return;
    try {
      await api.post(`/files/folders/${workspaceId}`, {
        name: newFolderName,
        parentId: currentFolderId
      });
      setNewFolderName('');
      setIsCreatingFolder(false);
      fetchData();
    } catch (err) {
      alert('Failed to create folder');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) formData.append('folderId', currentFolderId);
    if (fileDescription) formData.append('description', fileDescription);

    try {
      await api.post(`/files/workspace/${workspaceId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      setIsUploadModalOpen(false);
      setFileDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/files/${id}`);
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Are you sure? This will only delete the folder entry.')) return;
    try {
      await api.delete(`/files/folders/${id}`);
      setFolders(folders.filter(f => f.id !== id));
      if (currentFolderId === id) setCurrentFolderId(null);
    } catch (err) {
      alert('Failed to delete folder');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const currentFiles = useMemo(() => {
    let filtered = files.filter(f => f.folderId === currentFolderId);
    if (searchQuery) {
        filtered = files.filter(f => 
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return filtered;
  }, [files, currentFolderId, searchQuery]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let currId = currentFolderId;
    while (currId) {
      const folder = folders.find(f => f.id === currId);
      if (folder) {
        crumbs.unshift(folder);
        currId = folder.parentId;
      } else break;
    }
    return crumbs;
  }, [folders, currentFolderId]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* File Explorer Header */}
      <div className="p-4 md:p-8 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm z-10">
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                        <HardDrive className="text-blue-600" size={32} />
                        Assets & Files
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Collaborative resource sharing for your workspace.</p>
                </div>
                
                {!isPicker && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => setIsCreatingFolder(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-all text-slate-700 dark:text-slate-200"
                        >
                            <FolderPlus size={18} /> Folder
                        </button>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Upload size={18} /> Upload
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="Search files, folders or descriptions..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 border-2 focus:border-blue-500 rounded-2xl outline-none transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Breadcrumbs */}
            {!searchQuery && (
                <div className="flex items-center gap-1 text-sm font-bold text-slate-400 mb-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setCurrentFolderId(null)}
                        className={`hover:text-blue-600 transition-colors ${!currentFolderId ? 'text-blue-600' : ''}`}
                    >
                        Root
                    </button>
                    {breadcrumbs.map((crumb) => (
                        <div key={crumb.id} className="flex items-center gap-1">
                            <ChevronRight size={14} className="opacity-50" />
                            <button 
                                onClick={() => setCurrentFolderId(crumb.id)}
                                className={`hover:text-blue-600 transition-colors ${currentFolderId === crumb.id ? 'text-blue-600' : ''}`}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {searchQuery && (
                <div className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                    <Search size={16} /> Results for "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="text-blue-600 hover:underline">Clear search</button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Folders */}
                {!searchQuery && currentFolders.map(folder => (
                    <div 
                        key={folder.id}
                        onDoubleClick={() => setCurrentFolderId(folder.id)}
                        className="group bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-2xl hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3 overflow-hidden" onClick={() => setCurrentFolderId(folder.id)}>
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                <FolderIcon size={24} fill="currentColor" />
                            </div>
                            <span className="font-bold truncate text-slate-800 dark:text-slate-200">{folder.name}</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {/* Files */}
                {currentFiles.map(file => (
                    <div key={file.id} className="group bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden hover:border-blue-500/50 hover:shadow-xl transition-all flex flex-col">
                        <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative group/preview">
                            {file.type.startsWith('image/') ? (
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                                <FileText size={48} className="text-slate-200 dark:text-slate-800" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                {onSelect ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onSelect(file); }}
                                        className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:scale-110 transition-transform shadow-xl shadow-blue-500/30 text-xs uppercase tracking-widest"
                                    >
                                        Select File
                                    </button>
                                ) : (
                                    <>
                                        <a href={file.url} target="_blank" rel="noreferrer" className="p-3 bg-white rounded-2xl text-slate-900 hover:scale-110 transition-transform shadow-xl" title="Open in new tab">
                                            <ImageIcon size={20} />
                                        </a>
                                        {(file.type.startsWith('text/') || file.type.includes('javascript') || file.type.includes('json') || file.type.includes('python') || file.name.match(/\.(ts|tsx|py|java|cpp|c|cs|go|rs|php|sh|md)$/)) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleViewCode(file); }}
                                                className="p-3 bg-white rounded-2xl text-blue-600 hover:scale-110 transition-transform shadow-xl"
                                                title="View Code"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        )}
                                        <a href={file.url} download={file.name} className="p-3 bg-blue-600 rounded-2xl text-white hover:scale-110 transition-transform shadow-xl shadow-blue-500/30" title="Download">
                                            <Download size={20} />
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate flex-1" title={file.name}>{file.name}</h3>
                                <button onClick={() => deleteFile(file.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            {file.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 italic">"{file.description}"</p>
                            )}
                            
                            <div className="mt-auto space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={10} /> {new Date(file.createdAt).toLocaleDateString()}
                                    </span>
                                    <span>{formatSize(file.size)}</span>
                                </div>
                                
                                <div className="pt-3 border-t dark:border-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center">
                                        {file.uploader.avatarUrl ? (
                                            <img src={file.uploader.avatarUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={12} className="text-slate-400" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 truncate">
                                        {file.uploader.username || file.uploader.email.split('@')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {currentFolders.length === 0 && currentFiles.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <HardDrive size={64} className="mb-4 opacity-50" />
                    <p className="text-2xl font-black">Empty directory</p>
                    <p className="text-sm font-bold uppercase tracking-widest mt-2">Start by uploading or creating a folder</p>
                </div>
            )}
        </div>
      </div>

      {/* Modals */}
      {isCreatingFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border dark:border-slate-800">
                  <h3 className="text-xl font-black mb-4">New Folder</h3>
                  <input 
                    autoFocus
                    type="text"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent transition-all font-bold mb-6"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setIsCreatingFolder(false)} className="flex-1 p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                      <button onClick={createFolder} className="flex-1 bg-blue-600 text-white font-black p-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Create</button>
                  </div>
              </div>
          </div>
      )}

      {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black">Upload Resource</h3>
                      <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>

                  <div className="space-y-6">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-12 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 cursor-pointer group transition-all"
                      >
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                              <Upload size={32} />
                          </div>
                          <p className="font-bold text-slate-500 text-center px-4">Click to select or drag and drop your file here</p>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />

                      <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Commit Description (Optional)</label>
                          <textarea 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent transition-all font-medium h-24 resize-none"
                            placeholder="Briefly describe what this file is for..."
                            value={fileDescription}
                            onChange={(e) => setFileDescription(e.target.value)}
                          />
                      </div>

                      <button 
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {uploading ? 'Processing...' : 'Continue to Upload'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Code Preview Modal */}
      {previewFile && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-5xl h-[85vh] bg-slate-900 rounded-[40px] shadow-2xl relative border border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl z-10">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <Code size={24} />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-white">{previewFile.name}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                {previewFile.type} • {formatSize(previewFile.size)}
                            </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          {!isEditing ? (
                              <button 
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                              >
                                Edit File
                              </button>
                          ) : (
                              <button 
                                onClick={handleSaveFile}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-500/20"
                              >
                                Save Changes
                              </button>
                          )}
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(previewContent);
                                alert('Copied to clipboard!');
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
                          >
                            Copy Code
                          </button>
                          <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                              <X size={24} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-slate-950 p-6 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-800">
                      {loadingPreview ? (
                          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <p className="font-bold uppercase tracking-widest text-[10px]">Loading Content...</p>
                          </div>
                      ) : isEditing ? (
                          <textarea 
                            className="w-full h-full bg-transparent text-slate-300 outline-none resize-none"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                      ) : (
                          <pre className="hljs bg-transparent !p-0">
                              <code 
                                dangerouslySetInnerHTML={{ 
                                    __html: hljs.highlightAuto(previewContent).value 
                                }} 
                              />
                          </pre>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

