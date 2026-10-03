# SPDX-FileCopyrightText: 2026 Tico Hannan
# SPDX-License-Identifier: MIT
import re,base64,zlib,struct,sys
def dec(b, i=0):
    tag=chr(b[i]); i+=1
    if tag=='f':
        n=struct.unpack('<i',b[i:i+4])[0]; i+=4
        h,i=dec(b,i); args=[]
        for _ in range(n):
            a,i=dec(b,i); args.append(a)
        return (h,args),i
    if tag in 'sSIR':
        n=struct.unpack('<i',b[i:i+4])[0]; i+=4
        v=b[i:i+n].decode('utf8','replace'); i+=n
        return (('Sym' if tag=='s' else 'Str' if tag=='S' else 'Big'), v),i
    if tag=='i': return struct.unpack('<i',b[i:i+4])[0],i+4
    if tag=='L': return struct.unpack('<q',b[i:i+8])[0],i+8
    if tag=='r': return struct.unpack('<d',b[i:i+8])[0],i+8
    if tag in 'en':
        rank=struct.unpack('<i',b[i:i+4])[0]; i+=4
        dims=struct.unpack('<'+'i'*rank,b[i:i+4*rank]); i+=4*rank
        cnt=1
        for d in dims: cnt*=d
        fmt,sz=('d',8) if tag=='e' else ('i',4)
        data=list(struct.unpack('<'+fmt*cnt,b[i:i+sz*cnt])); i+=sz*cnt
        return ('Packed',dims,data),i
    raise ValueError(f'tag {tag!r} at {i-1}: {b[i-1:i+20]}')
def show(e):
    if isinstance(e,tuple):
        if e[0]=='Sym': return e[1].split('`')[-1]
        if e[0]=='Str': return repr(e[1])
        if e[0]=='Big': return e[1]
        if e[0]=='Packed':
            d=e[2]
            if len(e[1])==2:
                c=e[1][1]; return '{'+','.join('{'+','.join(f'{x:.4g}' for x in d[k*c:(k+1)*c])+'}' for k in range(e[1][0]))+'}'
            return '{'+','.join(f'{x:.4g}' for x in d)+'}'
        h,a=e
        hs=show(h)
        if hs=='List': return '{'+', '.join(show(x) for x in a)+'}'
        return hs+'['+', '.join(show(x) for x in a)+']'
    return f'{e:.6g}' if isinstance(e,float) else str(e)
if __name__=='__main__':
    t=open(sys.argv[1]).read()
    for k,m in enumerate(re.finditer(r'CompressedData\["', t)):
        j=t.index('"]',m.end()); s=re.sub(r'[\s\\]','',t[m.end():j])
        b=zlib.decompress(base64.b64decode(s[2:]))
        e,_=dec(b,4)
        out=show(e)
        print(k, out[:int(sys.argv[2]) if len(sys.argv)>2 else 3000])
