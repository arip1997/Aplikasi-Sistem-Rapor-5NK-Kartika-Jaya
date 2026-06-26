const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// The problematic snippet 1:
const snippet1 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : (`;

const replace1 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )) : (`;

content = content.replace(snippet1, replace1);

const snippet2 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

const replace2 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

content = content.replace(snippet2, replace2);

const snippet3 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="w-[210mm] h-[297mm] flex flex-col gap-2 items-center justify-center font-bold text-slate-400 bg-slate-50 italic">
                <AlertTriangle className="h-10 w-10 text-slate-300" />
                <p>Data murid gagal dimuat atau kosong.</p>
              </div>
                            </div>
                          )}
                        </div>
                      </div>,
        document.body
      )}`;

const replace3 = `                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )) : (
              <div className="w-[210mm] h-[297mm] flex flex-col gap-2 items-center justify-center font-bold text-slate-400 bg-slate-50 italic">
                <AlertTriangle className="h-10 w-10 text-slate-300" />
                <p>Data murid gagal dimuat atau kosong.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}`;

content = content.replace(snippet3, replace3);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Fixed manually.");
