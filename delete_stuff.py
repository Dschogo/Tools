import tqdm
import os

the_path = "G:\VST_Plugins\Kinetic Metal"

add_path = "_temp_copy"

result = [os.path.join(dp, f) for dp, dn, filenames in os.walk(the_path) for f in filenames if f.endswith(add_path)]


print(len(result))

size0 = 0
print("RENAMING")
for i in tqdm.tqdm(range(len(result))):
    size0 += os.path.getsize(result[i])
    os.rename(result[i], result[i].replace(add_path, ""))
