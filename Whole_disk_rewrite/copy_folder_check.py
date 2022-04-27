import sys
import os
import shutil
import tqdm
import math

source = "G:\Samples"
dest = "H:\Programs\G\Samples"

source_res = [os.path.join(dp, f) for dp, dn, filenames in os.walk(source) for f in filenames]

size_total = 0
for i in tqdm.tqdm(range(len(source_res))):
    size_total += os.path.getsize(source_res[i])
pbar = tqdm.tqdm(total=math.floor(size_total / 1000000))

skip_count = 0

for i in tqdm.tqdm(range(len(source_res))):

    if os.path.exists(source_res[i].replace(source, dest)):
        if os.path.getsize(source_res[i]) == os.path.getsize(source_res[i].replace(source, dest)):
            skip_count += 1
            continue
        else:
            os.remove(source_res[i].replace(source, dest))
    pbar.set_description(
        "Copying: " + source_res[i] + "  " + str(math.floor(os.path.getsize(source_res[i]) / 1000000)) + "mb"
    )
    os.makedirs(os.path.dirname(source_res[i].replace(source, dest)), exist_ok=True)
    shutil.copy(source_res[i], source_res[i].replace(source, dest))
    pbar.update(math.floor(os.path.getsize(source_res[i]) / 1000000))

pbar.close()
print("")
print("")
print(f"Done  skipped {skip_count}/{len(source_res)} files")
